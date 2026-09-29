import { format, isWeekend, subMinutes } from 'date-fns'

export const DEFAULT_SETTINGS = {
  targetTime: '08:30',
  graceMinutes: 15,
  dayStart: '04:00',
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

const minutesOf = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// The day `now` belongs to: before the day start (e.g. 1 AM) it's still the
// previous day. Returns a Date whose calendar date is that day.
export function dayOf(now, settings) {
  return subMinutes(now, minutesOf(settings.dayStart))
}

// Returns a new state with today's login recorded, or the same state if
// today is a weekend, already has a login, or it's before the day start
// (a late-night visit isn't a morning log-on).
export function recordLoginIfNeeded(state, now = new Date()) {
  if (isWeekend(now)) return state
  if (now.getHours() * 60 + now.getMinutes() < minutesOf(state.settings.dayStart)) return state

  const key = toDateKey(now)
  if (state.entries[key]) return state

  return {
    ...state,
    entries: { ...state.entries, [key]: { time: toTimeString(now) } },
  }
}

// Stats are computed on the fly, so new settings re-grade past days too.
export function updateSettings(state, settings) {
  return { ...state, settings: { ...state.settings, ...settings } }
}

// Manually set (or add) the login time for a day.
export function setLoginTime(state, dateKey, time) {
  return {
    ...state,
    entries: { ...state.entries, [dateKey]: { time, edited: true } },
  }
}

// Removes a day's login; a past weekday without one counts as missed.
export function deleteLogin(state, dateKey) {
  const entries = { ...state.entries }
  delete entries[dateKey]
  return { ...state, entries }
}

// Backups are the saved state plus when it was exported.
export function createBackup(state, now = new Date()) {
  return { ...state, exportedAt: now.toISOString() }
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

// Turns a backup file's text into a clean state, or throws an Error whose
// message is safe to show. Nothing is saved here.
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (!data || typeof data !== 'object' || !data.entries || typeof data.entries !== 'object') {
    throw new Error("That file doesn't look like a Rise backup.")
  }

  const entries = {}
  for (const [key, entry] of Object.entries(data.entries)) {
    if (!DATE_KEY.test(key) || toDateKey(new Date(`${key}T12:00`)) !== key || !TIME.test(entry?.time)) {
      throw new Error(`The backup has an invalid day (${key}).`)
    }
    entries[key] = entry.edited ? { time: entry.time, edited: true } : { time: entry.time }
  }

  const saved = data.settings ?? {}
  const settings = { ...DEFAULT_SETTINGS }
  if (TIME.test(saved.targetTime)) settings.targetTime = saved.targetTime
  if (Number.isInteger(saved.graceMinutes) && saved.graceMinutes >= 0 && saved.graceMinutes <= 60) {
    settings.graceMinutes = saved.graceMinutes
  }
  if (TIME.test(saved.dayStart) && minutesOf(saved.dayStart) < minutesOf(settings.targetTime)) {
    settings.dayStart = saved.dayStart
  }

  return { version: 1, settings, entries }
}
