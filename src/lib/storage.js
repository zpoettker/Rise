import { readCustom, readCustomLog } from './customConfig'
import { createInitialState, DEFAULT_SETTINGS, readEnabledTrackers, readWorkGoals } from './logins'

// Data saved before accounts (and the local-only copy without Supabase) lives
// under 'rise:data'. Signed in, each account keeps its own copy on the device
// under 'rise:data:<user id>' (the account in Supabase is the real one).
const STORAGE_KEY = 'rise:data'
export const accountKey = (userId) => `${STORAGE_KEY}:${userId}`

export function hasSavedState(key = STORAGE_KEY) {
  try {
    return localStorage.getItem(key) != null
  } catch {
    return false
  }
}

export function loadState(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return createInitialState()

    const parsed = JSON.parse(raw)
    // eslint-disable-next-line no-unused-vars
    const { workGoalMinutes, ...saved } = parsed.settings ?? {}
    return {
      ...createInitialState(),
      ...parsed,
      // older saves had one work goal; it becomes the start of the history
      settings: {
        ...DEFAULT_SETTINGS,
        ...saved,
        workGoals: readWorkGoals(parsed.settings),
        custom: readCustom(parsed.settings),
        enabledTrackers: readEnabledTrackers(parsed.settings),
      },
      customLog: readCustomLog(parsed.customLog),
      customSlips: readCustomLog(parsed.customSlips),
    }
  } catch {
    return createInitialState()
  }
}

export function saveState(state, key = STORAGE_KEY) {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // storage full or blocked; nothing useful to do here
  }
}

// The last day the hit celebration played, kept apart from the data so it
// never ends up in backups.
const CELEBRATED_KEY = 'rise:celebrated'

export function loadCelebratedDay() {
  try {
    return localStorage.getItem(CELEBRATED_KEY)
  } catch {
    return null
  }
}

export function saveCelebratedDay(dateKey) {
  try {
    localStorage.setItem(CELEBRATED_KEY, dateKey)
  } catch {
    // blocked storage just means the celebration may replay
  }
}

// The period (day, or week for workouts) each tracker's goal celebration last
// played for: { workout: '2026-11-23', work: '2026-11-24', … }. Kept out of
// backups like the morning one.
const CELEBRATIONS_KEY = 'rise:celebrations'

export function loadCelebrations() {
  try {
    return JSON.parse(localStorage.getItem(CELEBRATIONS_KEY)) ?? {}
  } catch {
    return {}
  }
}

export function saveCelebration(id, periodKey) {
  try {
    localStorage.setItem(CELEBRATIONS_KEY, JSON.stringify({ ...loadCelebrations(), [id]: periodKey }))
  } catch {
    // blocked storage just means the celebration may replay
  }
}

// The pre-accounts data, once it's been uploaded to an account (or set aside)
export function clearLegacyState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to do
  }
}

// The rows last confirmed in the account (sync.js), per account, so changes
// made offline are still sent after a reload
const syncedKey = (userId) => `rise:synced:${userId}`

export function loadSyncedRows(userId) {
  try {
    return JSON.parse(localStorage.getItem(syncedKey(userId)))
  } catch {
    return null
  }
}

export function saveSyncedRows(userId, rows) {
  try {
    localStorage.setItem(syncedKey(userId), JSON.stringify(rows))
  } catch {
    // worst case the next sync resends a little more
  }
}

// "Start fresh" was picked instead of uploading this device's data
const dismissedKey = (userId) => `rise:upload-dismissed:${userId}`

export function isUploadDismissed(userId) {
  try {
    return localStorage.getItem(dismissedKey(userId)) === '1'
  } catch {
    return false
  }
}

export function dismissUpload(userId) {
  try {
    localStorage.setItem(dismissedKey(userId), '1')
  } catch {
    // it may be offered again; harmless
  }
}
