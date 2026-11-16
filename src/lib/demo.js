import {
  addDays,
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
// `todayWorkHours` sets how much work is logged today (?demo&work=7).
export function createDemoState(
  today = new Date(),
  { hitToday = false, weekWorkouts = null, todayWorkHours = null } = {},
) {
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

  // replace this week's workouts with one on each of the first N days of the
  // Mon–Sun week. Early in the week that includes days still to come, so any
  // count can be previewed whatever today is.
  if (weekWorkouts != null) {
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    state.workouts = state.workouts.filter((w) => w.start.slice(0, 10) < toDateKey(monday))
    const week = eachDayOfInterval({ start: monday, end: addDays(monday, 6) })
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

  // replace today's work with sessions adding up to N hours, from 8 AM in
  // blocks of up to 2h with 15 min breaks (later blocks may be in the future)
  if (todayWorkHours != null) {
    const todayKey = toDateKey(today)
    state.workSessions = state.workSessions.filter((s) => s.start.slice(0, 10) !== todayKey)
    let left = Math.round(todayWorkHours * 60)
    let clock = 8 * 60
    while (left > 0) {
      const length = Math.min(left, 120)
      const start = at(today, clock)
      state.workSessions.push({ id: `s${id++}`, start: stamp(start), end: stamp(addMinutes(start, length)) })
      left -= length
      clock += length + 15
    }
  }

  return state
}
