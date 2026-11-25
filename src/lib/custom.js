import {
  addDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  max,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { toDateKey } from './logins'
import { rangeStart, streaks } from './stats'
import { weekLevel } from './workouts'

// The custom tracker's days, weeks and stats (its setup and colours are in
// customConfig.js). Data: `customLog`, the days checked off as
// { 'yyyy-MM-dd': true }.

export function isCustomDone(state, date) {
  return Boolean(state.customLog?.[date])
}

// Checks a day off, or clears it
export function toggleCustomDay(state, date) {
  const log = { ...state.customLog }
  if (log[date]) delete log[date]
  else log[date] = true
  return { ...state, customLog: log }
}

// The first day checked off, or null
export function customStart(state) {
  const keys = Object.keys(state.customLog ?? {}).sort()
  return keys.length ? parseISO(keys[0]) : null
}

const WEEK = { weekStartsOn: 1 }
const weekKey = (date) => toDateKey(startOfWeek(date, WEEK))

// Days checked off in each Mon–Sun week, keyed by the week's Monday
function weekCounts(state) {
  const counts = {}
  for (const date of Object.keys(state.customLog ?? {})) {
    const week = weekKey(parseISO(date))
    counts[week] = (counts[week] ?? 0) + 1
  }
  return counts
}

// Every day from `from` to `today` (from the first check-off).
//   daily goal: 'hit' (done) | 'missed' | 'pending' (today, not yet)
//   weekly goal: 'hit' (shaded by its week against the goal) | 'rest' | 'pending'
export function getCustomDays(state, from, today = new Date()) {
  const custom = state.settings.custom
  const start = customStart(state)
  if (!custom || !start) return []
  const first = max([startOfDay(from), start])
  const last = startOfDay(today)
  if (first > last) return []

  const todayKey = toDateKey(today)
  const weeks = custom.goal === 'weekly' ? weekCounts(state) : null
  return eachDayOfInterval({ start: first, end: last }).map((day) => {
    const date = toDateKey(day)
    if (isCustomDone(state, date)) {
      if (!weeks) return { date, status: 'hit', level: 3 }
      const weekDays = weeks[weekKey(day)]
      return { date, status: 'hit', level: weekLevel(weekDays, custom.perWeek), weekDays }
    }
    if (date === todayKey) return { date, status: 'pending' }
    return { date, status: weeks ? 'rest' : 'missed' }
  })
}

// Mon–Sun weeks from the week holding `from` (or the first check-off) through
// this week, for a weekly goal. This week stays 'pending' until it's met.
export function getCustomWeeks(state, from, today = new Date()) {
  const start = customStart(state)
  if (!start) return []
  const first = startOfWeek(max([startOfDay(from), start]), WEEK)
  const thisWeek = startOfWeek(today, WEEK)
  if (first > thisWeek) return []
  const goal = state.settings.custom?.perWeek ?? 3
  return eachWeekOfInterval({ start: first, end: thisWeek }, WEEK).map((weekStart) => {
    let days = 0
    for (let i = 0; i < 7; i++) if (isCustomDone(state, toDateKey(addDays(weekStart, i)))) days++
    const current = +weekStart === +thisWeek
    const status = days >= goal ? 'hit' : current ? 'pending' : 'missed'
    return { start: toDateKey(weekStart), days, status }
  })
}

// Streaks (days or weeks in a row on goal), the success rate over the range,
// and totals
export function getCustomStats(state, range = '30d', today = new Date()) {
  const start = customStart(state)
  const weekly = state.settings.custom?.goal === 'weekly'
  const periods = (from) => (weekly ? getCustomWeeks : getCustomDays)(state, from, today)
  const { current, best } = streaks(periods(start ?? today))
  const decided = periods(rangeStart(range, start, today)).filter((p) => p.status !== 'pending')
  const hits = decided.filter((p) => p.status === 'hit').length
  const thisWeek = getCustomWeeks(state, today, today).at(-1)?.days ?? 0
  return {
    currentStreak: current,
    bestStreak: best,
    hits,
    misses: decided.length - hits,
    decided: decided.length,
    hitRate: decided.length ? hits / decided.length : null,
    totalDays: Object.keys(state.customLog ?? {}).length,
    thisWeek,
  }
}
