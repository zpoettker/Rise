import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  max,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { toDateKey } from './logins'
import { firstDay, spanDay, totalsByDay } from './spans'
import { rangeStart, streaks } from './stats'

// Workouts count by the week: a Mon–Sun week is a hit when you worked out on
// at least `workoutWeeklyGoal` days. Days without a workout are rest days,
// never failures on their own.

const WEEK = { weekStartsOn: 1 }

export const workoutStart = (state) => firstDay(totalsByDay(state.workouts, state.settings))

// How a workout day is shaded, from how many workout days its Mon–Sun week
// has against the weekly goal: light under it, medium on it, dark over it.
export function weekLevel(weekDays, goal) {
  if (weekDays < goal) return 1
  if (weekDays === goal) return 3
  return 5
}

// Workout days in each Mon–Sun week, keyed by the week's Monday
function weekCounts(totals) {
  const counts = {}
  for (const date of Object.keys(totals)) {
    const week = toDateKey(startOfWeek(parseISO(date), WEEK))
    counts[week] = (counts[week] ?? 0) + 1
  }
  return counts
}

// Every day from `from` to `today` (clamped to the first workout):
// 'hit' (worked out), 'rest', or 'pending' (today, nothing yet). Hits carry
// `weekDays` (workout days in their week) and a `level` from it.
export function getWorkoutDays(state, from, today = new Date()) {
  const totals = totalsByDay(state.workouts, state.settings)
  const start = firstDay(totals)
  if (!start) return []

  const first = max([startOfDay(from), start])
  const last = startOfDay(today)
  if (first > last) return []

  const todayKey = toDateKey(today)
  const weeks = weekCounts(totals)
  const goal = state.settings.workoutWeeklyGoal
  return eachDayOfInterval({ start: first, end: last }).map((day) => {
    const date = toDateKey(day)
    const total = totals[date]
    if (total) {
      const weekDays = weeks[toDateKey(startOfWeek(day, WEEK))]
      return { date, status: 'hit', level: weekLevel(weekDays, goal), weekDays, ...total }
    }
    return { date, status: date === todayKey ? 'pending' : 'rest', count: 0, minutes: 0 }
  })
}

// Mon–Sun weeks from the week holding `from` (or the first workout, if later)
// through this week. `days` is how many days had a workout. This week stays
// 'pending' until the goal is met.
export function getWorkoutWeeks(state, from, today = new Date()) {
  const totals = totalsByDay(state.workouts, state.settings)
  const start = firstDay(totals)
  if (!start) return []

  const first = startOfWeek(max([startOfDay(from), start]), WEEK)
  const thisWeek = startOfWeek(today, WEEK)
  if (first > thisWeek) return []

  const goal = state.settings.workoutWeeklyGoal
  return eachWeekOfInterval({ start: first, end: thisWeek }, WEEK).map((weekStart) => {
    let days = 0
    let minutes = 0
    for (let i = 0; i < 7; i++) {
      const total = totals[toDateKey(addDays(weekStart, i))]
      if (total) {
        days += 1
        minutes += total.minutes
      }
    }
    const current = weekStart.getTime() === thisWeek.getTime()
    const status = days >= goal ? 'hit' : current ? 'pending' : 'missed'
    return { start: toDateKey(weekStart), days, minutes, status }
  })
}

// This Mon–Sun week for the progress card: workout days so far against the
// goal, which days had one, and how many days are left (today included).
export function getWorkoutWeek(state, today = new Date()) {
  const start = startOfWeek(today, WEEK)
  const totals = totalsByDay(state.workouts, state.settings)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const key = toDateKey(date)
    const now = startOfDay(today)
    return { date: key, worked: Boolean(totals[key]), future: date > now, today: +date === +now }
  })
  return {
    start: toDateKey(start),
    end: toDateKey(addDays(start, 6)),
    goal: state.settings.workoutWeeklyGoal,
    workoutDays: days.filter((d) => d.worked).length,
    minutes: days.reduce((sum, d) => sum + (totals[d.date]?.minutes ?? 0), 0),
    daysLeft: 7 - differenceInCalendarDays(startOfDay(today), start),
    days,
  }
}

export function getWorkoutStats(state, range = '30d', today = new Date()) {
  const start = workoutStart(state)
  const allWeeks = getWorkoutWeeks(state, start ?? today, today)
  const { current, best } = streaks(allWeeks)

  const from = rangeStart(range, start, today)
  const decided = getWorkoutWeeks(state, from, today).filter((w) => w.status !== 'pending')
  const weeksOnGoal = decided.filter((w) => w.status === 'hit').length
  const workoutDays = getWorkoutDays(state, from, today).filter((d) => d.status === 'hit')
  const totalMinutes = workoutDays.reduce((sum, d) => sum + d.minutes, 0)
  const workouts = workoutDays.reduce((sum, d) => sum + d.count, 0)

  return {
    currentStreak: current,
    bestStreak: best,
    weeksOnGoal,
    weeksShort: decided.length - weeksOnGoal,
    trackedWeeks: decided.length,
    hitRate: decided.length ? weeksOnGoal / decided.length : null,
    workoutDays: workoutDays.length,
    workouts,
    totalMinutes,
    averageMinutes: workouts ? totalMinutes / workouts : null,
    // the weeks always run through this week, so the last one is it
    thisWeekDays: allWeeks.at(-1)?.days ?? 0,
  }
}

// --- Editing one day's workouts (the calendar / week popup) ---

const toMinutes = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
const stamp = (date, minute) => format(addMinutes(parseISO(date), minute), "yyyy-MM-dd'T'HH:mm")

// The day's workouts as { id, start, end } ('HH:mm' clock times), earliest first
export function workoutsOn(state, date) {
  return state.workouts
    .filter((w) => w.end && spanDay(w, state.settings) === date)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((w) => ({ id: w.id, start: w.start.slice(11), end: w.end.slice(11) }))
}

// A row of clock times placed on `date`, in minutes from that day's midnight.
// A start before the day start (e.g. 1 AM) is the night after; an end at or
// before the start runs past midnight.
export function placeWorkout(row, settings) {
  let start = toMinutes(row.start)
  if (start < toMinutes(settings.dayStart)) start += 24 * 60
  let end = toMinutes(row.end)
  while (end <= start) end += 24 * 60
  return { start, end, minutes: end - start }
}

// Ids of rows that overlap another row
export function overlappingWorkouts(rows, settings) {
  const placed = rows.map((r) => ({ id: r.id, ...placeWorkout(r, settings) }))
  const bad = new Set()
  for (const a of placed) {
    for (const b of placed) {
      if (a !== b && a.start < b.end && b.start < a.end) bad.add(a.id)
    }
  }
  return bad
}

// Replaces the day's workouts with `rows` ({ id, start, end } clock times)
export function setDayWorkouts(state, date, rows) {
  const kept = state.workouts.filter((w) => spanDay(w, state.settings) !== date)
  const edited = rows.map((row) => {
    const { start, end } = placeWorkout(row, state.settings)
    return { id: row.id, start: stamp(date, start), end: stamp(date, end) }
  })
  return { ...state, workouts: [...kept, ...edited] }
}
