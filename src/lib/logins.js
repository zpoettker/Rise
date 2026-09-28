import { format, isWeekend } from 'date-fns'

export const DEFAULT_SETTINGS = {
  targetTime: '08:30',
  graceMinutes: 15,
}

// entries are keyed by local date ('yyyy-MM-dd') so each day holds at most one login
export function createInitialState() {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    entries: {},
  }
}

export const toDateKey = (date) => format(date, 'yyyy-MM-dd')
export const toTimeString = (date) => format(date, 'HH:mm')

// Returns a new state with today's login recorded, or the same state if
// today is a weekend or already has a login.
export function recordLoginIfNeeded(state, now = new Date()) {
  if (isWeekend(now)) return state

  const key = toDateKey(now)
  if (state.entries[key]) return state

  return {
    ...state,
    entries: { ...state.entries, [key]: { time: toTimeString(now) } },
  }
}

// Manually set (or add) the login time for a day.
export function setLoginTime(state, dateKey, time) {
  return {
    ...state,
    entries: { ...state.entries, [dateKey]: { time, edited: true } },
  }
}
