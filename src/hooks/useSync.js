import { useCallback, useEffect, useRef, useState } from 'react'
import { createInitialState, recordLoginIfNeeded, updateSettings } from '../lib/logins'
import { loadRemote, pushChanges } from '../lib/remote'
import {
  clearLegacyState,
  dismissUpload,
  hasSavedState,
  isUploadDismissed,
  loadState,
  loadSyncedRows,
  saveSyncedRows,
} from '../lib/storage'
import { diffRows, fromRows, hasData, isEmptyAccount, toRows } from '../lib/sync'
import { settleTimer } from '../lib/timer'

const SAVE_DELAY = 800 // ms of quiet before changes are sent
const RETRY_DELAY = 15000 // ms before trying again after a failed save

const freshen = (state) => settleTimer(recordLoginIfNeeded(state))

// Keeps the signed-in account (Supabase) and the app's state in step.
//
//   phase 'loading'  reading the account (the app waits behind a splash)
//         'offer'    a new, empty account and this device has data from before
//                    accounts: `upload()` it or `startFresh()`
//         'ready'    in sync; every change is sent after a short pause
//         'error'    couldn't reach the account and nothing is saved on this
//                    device to fall back on: `retry()`
//   status 'saved' | 'saving' | 'offline' (changes wait and are retried)
//
// The account's data replaces the device copy on load and whenever you come
// back to the tab (after sending anything still waiting), so other devices'
// changes show up. Off (null user) in the demo or without Supabase.
export function useSync(userId, state, setState, signupName = '') {
  const [phase, setPhase] = useState(userId ? 'loading' : 'off')
  const [status, setStatus] = useState('saved')
  const [offer, setOffer] = useState(null) // { state, counts } to upload
  const [attempt, setAttempt] = useState(0) // bumps to retry the first load
  const synced = useRef(null) // rows known to be in the account
  const latest = useRef(state) // the newest state, for timers and events
  const busy = useRef(false)
  const uploading = useRef(false)

  useEffect(() => {
    latest.current = state
  }, [state])

  // send whatever differs from the account
  const push = useCallback(async () => {
    if (!userId || busy.current) return false
    const rows = toRows(latest.current)
    const diff = diffRows(synced.current, rows)
    if (!diff.any) {
      setStatus('saved')
      return true
    }
    busy.current = true
    setStatus('saving')
    try {
      await pushChanges(userId, diff, rows)
      synced.current = rows
      saveSyncedRows(userId, rows)
      if (uploading.current) {
        uploading.current = false
        clearLegacyState()
      }
      setStatus('saved')
      return true
    } catch {
      setStatus('offline')
      return false
    } finally {
      busy.current = false
    }
  }, [userId])

  // read the account and use it, unless changes here haven't been sent yet
  const pull = useCallback(async () => {
    if (!userId) return
    if (!(await push())) return
    try {
      const rows = await loadRemote(userId)
      if (diffRows(toRows(latest.current), toRows(fromRows(rows))).any) {
        synced.current = rows
        saveSyncedRows(userId, rows)
        setState(freshen(fromRows(rows)))
      }
    } catch {
      setStatus('offline')
    }
  }, [userId, push, setState])

  // first load
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    loadRemote(userId)
      .then((rows) => {
        if (cancelled) return
        if (!isEmptyAccount(rows)) {
          synced.current = rows
          saveSyncedRows(userId, rows)
          setState(freshen(fromRows(rows)))
          setPhase('ready')
          return
        }
        // a new account: offer this device's data from before accounts
        synced.current = rows
        const legacy = hasSavedState() ? loadState() : null
        if (legacy && hasData(legacy) && !isUploadDismissed(userId)) {
          setOffer({ state: legacy, counts: countsOf(legacy) })
          setPhase('offer')
        } else {
          setPhase('ready')
        }
      })
      .catch(() => {
        if (cancelled) return
        // offline: keep going on the device copy and send changes later
        synced.current = loadSyncedRows(userId)
        if (synced.current) {
          setStatus('offline')
          setPhase('ready')
        } else {
          setPhase('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [userId, attempt, setState])

  // send changes after a short pause
  useEffect(() => {
    if (phase !== 'ready') return
    // a failed save is retried by the interval below
    const timer = setTimeout(push, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [state, phase, push])

  // keep retrying while offline, and catch up when the tab comes back
  useEffect(() => {
    if (phase !== 'ready') return
    const retry = setInterval(() => status === 'offline' && push(), RETRY_DELAY)
    const onVisible = () => document.visibilityState === 'visible' && pull()
    const onOnline = () => push()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      clearInterval(retry)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [phase, status, push, pull])

  const withName = (s) =>
    !s.settings.name && signupName ? updateSettings(s, { name: signupName.trim().slice(0, 30) }) : s

  return {
    phase,
    status,
    offer,
    upload() {
      uploading.current = true
      setState(withName(freshen(offer.state)))
      setOffer(null)
      setPhase('ready')
    },
    startFresh() {
      dismissUpload(userId)
      setState(withName(freshen(createInitialState())))
      setOffer(null)
      setPhase('ready')
    },
    retry() {
      setPhase('loading')
      setAttempt((a) => a + 1)
    },
  }
}

// what's in a device's data, for the upload question
function countsOf(state) {
  return {
    mornings: Object.keys(state.entries).length,
    workouts: state.workouts.length,
    sessions: state.workSessions.length,
    weights: state.weights.length,
  }
}
