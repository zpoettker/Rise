import { eachDayOfInterval, isWeekend, max, startOfDay } from 'date-fns'
import { toDateKey } from './logins'
import { firstDay, totalsByDay } from './spans'
import { rangeStart, streaks } from './stats'

// Work is timed in sessions; a day is a hit once its sessions add up to the
// daily goal. Weekends are only tracked when turned on.

export const isWorkDay = (date, settings) => settings.workWeekends || !isWeekend(date)

export const workStart = (state) => firstDay(totalsByDay(state.workSessions, state.settings))

// How strongly a hit day is shaded by time past the goal: 1 (< 1h) → 4 (3h+)
export function workLevel(minutesOverGoal) {
  if (minutesOverGoal >= 180) return 4
  if (minutesOverGoal >= 120) return 3
  if (minutesOverGoal >= 60) return 2
  return 1
}

// Every tracked day from `from` to `today` (clamped to the first session):
// 'hit' (goal reached), 'partial' (some time, under goal), 'missed' (none),
// or 'pending' (today, goal not reached yet).
export function getWorkDays(state, from, today = new Date()) {
  const totals = totalsByDay(state.workSessions, state.settings)
  const start = firstDay(totals)
  if (!start) return []

  const first = max([startOfDay(from), start])
  const last = startOfDay(today)
  if (first > last) return []

  const goal = state.settings.workGoalMinutes
  const todayKey = toDateKey(today)
  return eachDayOfInterval({ start: first, end: last })
    .filter((day) => isWorkDay(day, state.settings))
    .map((day) => {
      const date = toDateKey(day)
      const minutes = totals[date]?.minutes ?? 0
      if (minutes >= goal) return { date, status: 'hit', level: workLevel(minutes - goal), minutes }
      if (date === todayKey) return { date, status: 'pending', minutes }
      return { date, status: minutes > 0 ? 'partial' : 'missed', minutes }
    })
}

export function getWorkStats(state, range = '30d', today = new Date()) {
  const start = workStart(state)
  const { current, best } = streaks(getWorkDays(state, start ?? today, today))

  const days = getWorkDays(state, rangeStart(range, start, today), today)
  const decided = days.filter((d) => d.status !== 'pending')
  const count = (status) => decided.filter((d) => d.status === status).length
  const hits = count('hit')
  const worked = days.filter((d) => d.minutes > 0)
  const totalMinutes = worked.reduce((sum, d) => sum + d.minutes, 0)

  return {
    currentStreak: current,
    bestStreak: best,
    hits,
    partial: count('partial'),
    missed: count('missed'),
    trackedDays: decided.length,
    hitRate: decided.length ? hits / decided.length : null,
    totalMinutes,
    averageMinutes: worked.length ? totalMinutes / worked.length : null,
  }
}
