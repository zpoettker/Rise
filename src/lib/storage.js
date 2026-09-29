import { createInitialState, DEFAULT_SETTINGS } from './logins'

const STORAGE_KEY = 'rise:data'

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()

    const parsed = JSON.parse(raw)
    return {
      ...createInitialState(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    }
  } catch {
    return createInitialState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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
