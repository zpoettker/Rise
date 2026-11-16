import { addDays, eachDayOfInterval, eachWeekOfInterval, max, startOfDay, startOfWeek } from 'date-fns'
import { toDateKey } from './logins'
import { firstDay, totalsByDay } from './spans'
import { rangeStart, streaks } from './stats'

// Workouts count by the week: a Mon–Sun week is a hit when you worked out on
// at least `workoutWeeklyGoal` days. Days without a workout are rest days,
// never failures on their own.

const WEEK = { weekStartsOn: 1 }

export const workoutStart = (state) => firstDay(totalsByDay(state.workouts, state.settings))

// How strongly a workout day is shaded: 1 (under 30 min) → 4 (an hour or more)
export function workoutLevel(minutes) {
  if (minutes >= 60) return 4
  if (minutes >= 45) return 3
  if (minutes >= 30) return 2
  return 1
}

// Every day from `from` to `today` (clamped to the first workout):
// 'hit' (worked out), 'rest', or 'pending' (today, nothing yet).
export function getWorkoutDays(state, from, today = new Date()) {
  const totals = totalsByDay(state.workouts, state.settings)
  const start = firstDay(totals)
  if (!start) return []

  const first = max([startOfDay(from), start])
  const last = startOfDay(today)
  if (first > last) return []

  const todayKey = toDateKey(today)
  return eachDayOfInterval({ start: first, end: last }).map((day) => {
    const date = toDateKey(day)
    const total = totals[date]
    if (total) {
      return { date, status: 'hit', level: workoutLevel(total.minutes), ...total }
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
