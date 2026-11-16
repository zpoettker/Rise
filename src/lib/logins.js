import { format, isWeekend, subMinutes } from 'date-fns'

export const MAX_NAME_LENGTH = 30
export const MAX_WEEKLY_GOAL = 7
export const MAX_WORK_GOAL_MINUTES = 16 * 60

export const DEFAULT_SETTINGS = {
  name: '',
  targetTime: '08:30',
  graceMinutes: 15,
  dayStart: '04:00',
  // track Sat/Sun log-ons too (off: weekends are ignored, never missed)
  morningWeekends: false,
  // workouts per Mon–Sun week for a week to count toward the streak
  workoutWeeklyGoal: 3,
  // minutes of work for a day to count as a hit
  workGoalMinutes: 6 * 60,
  workWeekends: false,
}

// `entries` are morning log-ons keyed by local date ('yyyy-MM-dd'), so each day
// holds at most one. Workouts and work sessions are lists of
// { id, start, end } in local time ('yyyy-MM-ddTHH:mm').
export function createInitialState() {
  return {
    version: 2,
    settings: { ...DEFAULT_SETTINGS },
    entries: {},
    workouts: [],
    workSessions: [],
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

// Whether a date is a tracked morning (weekends only when turned on).
export const isMorningDay = (date, settings) => settings.morningWeekends || !isWeekend(date)

// Returns a new state with today's login recorded, or the same state if
// today is an untracked weekend, already has a login, or it's before the day
// start (a late-night visit isn't a morning log-on).
export function recordLoginIfNeeded(state, now = new Date()) {
  if (!isMorningDay(now, state.settings)) return state
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

// Backups are the saved state plus when it was exported. A running work timer
// is left out (its finished stretches are already in workSessions).
export function createBackup(state, now = new Date()) {
  // eslint-disable-next-line no-unused-vars
  const { timer, ...saved } = state
  return { ...saved, exportedAt: now.toISOString() }
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/

const isWholeNumber = (value, min, max) => Number.isInteger(value) && value >= min && value <= max

// Workouts / work sessions from a backup: each needs an id and a start before its end.
function parseSpans(list, what) {
  if (list == null) return []
  if (!Array.isArray(list)) throw new Error(`The backup's ${what} aren't a list.`)
  return list.map((item) => {
    const valid =
      item &&
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      DATE_TIME.test(item.start) &&
      DATE_TIME.test(item.end) &&
      item.start < item.end
    if (!valid) throw new Error(`The backup has an invalid entry in its ${what}.`)
    return { id: String(item.id), start: item.start, end: item.end }
  })
}

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
  if (typeof saved.name === 'string') settings.name = saved.name.trim().slice(0, MAX_NAME_LENGTH)
  if (TIME.test(saved.targetTime)) settings.targetTime = saved.targetTime
  if (isWholeNumber(saved.graceMinutes, 0, 60)) settings.graceMinutes = saved.graceMinutes
  if (TIME.test(saved.dayStart) && minutesOf(saved.dayStart) < minutesOf(settings.targetTime)) {
    settings.dayStart = saved.dayStart
  }

  if (typeof saved.morningWeekends === 'boolean') settings.morningWeekends = saved.morningWeekends
  if (typeof saved.workWeekends === 'boolean') settings.workWeekends = saved.workWeekends
  if (isWholeNumber(saved.workoutWeeklyGoal, 1, MAX_WEEKLY_GOAL)) {
    settings.workoutWeeklyGoal = saved.workoutWeeklyGoal
  }
  if (isWholeNumber(saved.workGoalMinutes, 1, MAX_WORK_GOAL_MINUTES)) {
    settings.workGoalMinutes = saved.workGoalMinutes
  }

  return {
    version: 2,
    settings,
    entries,
    workouts: parseSpans(data.workouts, 'workouts'),
    workSessions: parseSpans(data.workSessions, 'work sessions'),
  }
}
