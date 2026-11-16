import {
  addMinutes,
  eachDayOfInterval,
  format,
  isWeekend,
  setHours,
  setMinutes,
  startOfWeek,
  subDays,
} from 'date-fns'
import { createInitialState, toDateKey } from './logins'
import { formatMinutes, toMinutes } from './stats'

const stamp = (date) => format(date, "yyyy-MM-dd'T'HH:mm")
const at = (day, minutes) => setMinutes(setHours(day, 0), minutes)

// Fake history for previewing the UI in dev (open the app with ?demo). Never saved.
// `hitToday` adds an early log-on today (used by ?demo&celebrate).
// `weekWorkouts` sets how many days this week had a workout (?demo&week=2).
export function createDemoState(today = new Date(), { hitToday = false, weekWorkouts = null } = {}) {
  const state = createInitialState()
  const target = toMinutes(state.settings.targetTime)

  let seed = 42
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const between = (min, max) => Math.round(min + random() * (max - min))

  const past = eachDayOfInterval({ start: subDays(today, 240), end: subDays(today, 1) })

  for (const day of past) {
    if (isWeekend(day) || random() < 0.08) continue
    const offset = Math.round((random() - 0.6) * 60)
    state.entries[toDateKey(day)] = { time: formatMinutes(target + offset) }
  }
  if (hitToday && !isWeekend(today)) state.entries[toDateKey(today)] = { time: formatMinutes(target - 18) }

  // workouts: about 3–4 a week, 25–75 min, some weeks short of the goal
  let id = 0
  for (const day of past) {
    if (random() > 0.5) continue
    const start = at(day, between(6 * 60, 19 * 60))
    state.workouts.push({ id: `w${id++}`, start: stamp(start), end: stamp(addMinutes(start, between(25, 75))) })
  }

  // replace this week's workouts with one on each of the first N days (up to today)
  if (weekWorkouts != null) {
    const weekStart = toDateKey(startOfWeek(today, { weekStartsOn: 1 }))
    state.workouts = state.workouts.filter((w) => w.start.slice(0, 10) < weekStart)
    const week = eachDayOfInterval({ start: startOfWeek(today, { weekStartsOn: 1 }), end: today })
    for (const day of week.slice(0, weekWorkouts)) {
      const start = at(day, between(6 * 60, 19 * 60))
      state.workouts.push({ id: `w${id++}`, start: stamp(start), end: stamp(addMinutes(start, between(25, 75))) })
    }
  }

  // work: weekdays, two or three sessions adding up to roughly 3–9 hours
  for (const day of [...past, today]) {
    if (isWeekend(day) || random() < 0.06) continue
    const isToday = toDateKey(day) === toDateKey(today)
    let clock = between(8 * 60, 9 * 60 + 30)
    const sessions = isToday ? 1 : between(2, 3)
    for (let i = 0; i < sessions; i++) {
      const start = at(day, clock)
      const length = isToday ? 95 : between(100, 200)
      state.workSessions.push({ id: `s${id++}`, start: stamp(start), end: stamp(addMinutes(start, length)) })
      clock += length + between(20, 75)
    }
  }

  return state
}
