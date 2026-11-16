import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachWeekOfInterval,
  max,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { toDateKey } from './logins'
import { firstDay, totalsByDay } from './spans'
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
