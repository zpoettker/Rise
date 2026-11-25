import { readCustom, readCustomLog } from './customConfig'
import { createInitialState, DEFAULT_SETTINGS, readEnabledTrackers, readWorkGoals } from './logins'

const STORAGE_KEY = 'rise:data'

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
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
