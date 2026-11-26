import { useEffect, useState } from 'react'
import { createDemoState } from '../lib/demo'
import { recordLoginIfNeeded, updateSettings } from '../lib/logins'
import { accountKey, loadState, saveState } from '../lib/storage'
import { settleTimer } from '../lib/timer'

const params = new URLSearchParams(window.location.search)
// the demo (?demo) uses fake data, needs no account and never saves; open
// to anyone (it's the "Try the demo" link on the sign-in page)
export const DEMO = params.has('demo')
const CELEBRATE = params.has('celebrate')
const WEEK = params.has('week') ? Number(params.get('week')) : null
const WORK = params.has('work') ? Number(params.get('work')) : null

// Loads saved data and records today's login on mount and whenever the tab
// becomes visible again (covers Chrome being left open overnight).
// `signupName` (from the account) fills in the greeting's name if none is set.
// Signed in (`userId`), the device copy is that account's own (useSync loads
// the account's data over it and keeps the two in step).
export function useLoginData(signupName = '', userId = null) {
  const key = userId ? accountKey(userId) : undefined
  const [state, setState] = useState(() => {
    if (DEMO) {
      return createDemoState(new Date(), {
        hitToday: CELEBRATE,
        weekWorkouts: WEEK,
        todayWorkHours: WORK,
      })
    }
    const saved = settleTimer(recordLoginIfNeeded(loadState(key)))
    const name = typeof signupName === 'string' ? signupName.trim().slice(0, 30) : ''
    return !saved.settings.name && name ? updateSettings(saved, { name }) : saved
  })

  useEffect(() => {
    if (!DEMO) saveState(state, key)
  }, [state, key])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setState((s) => settleTimer(recordLoginIfNeeded(s)))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return [state, setState]
}
