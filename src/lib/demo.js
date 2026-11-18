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
import { goalOn } from './work'

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

  // work: the goal ramps from 2h toward 8h, raised every 4 weeks (on Mondays)
  const monday = (daysAgo) => toDateKey(startOfWeek(subDays(today, daysAgo), { weekStartsOn: 1 }))
  const ramp = [150, 180, 240, 270, 330, 360, 420, 480]
  state.settings.workGoals = [
    { from: '2000-01-01', minutes: 120 },
    ...ramp.map((minutes, i) => ({ from: monday(240 - 28 * (i + 1)), minutes })),
  ]

  // weekdays: hours swing a lot around that day's goal (about 45–150% of it,
  // the odd day off), so they climb with the goal; split into focus blocks
  for (const day of [...past, today]) {
    if (isWeekend(day) || random() < 0.07) continue
    const isToday = toDateKey(day) === toDateKey(today)
    const goal = goalOn(state.settings, day)
    let left = isToday ? Math.round(goal * 0.3) : Math.min(11 * 60, Math.round(goal * (0.45 + random() * 1.05)))
    let clock = between(7 * 60 + 30, 9 * 60 + 30)
    while (left > 0) {
      const length = Math.min(left, between(45, 150))
      const start = at(day, clock)
      state.workSessions.push({ id: `s${id++}`, start: stamp(start), end: stamp(addMinutes(start, length)) })
      left -= length
      clock += length + between(10, 60)
    }
  }

  // weigh-ins most mornings: about 194 lb drifting down to ~181 with daily
  // noise (own random sequence, so the rest of the demo stays the same)
  let weightSeed = 7
  const weightRandom = () => (weightSeed = (weightSeed * 16807) % 2147483647) / 2147483647
  past.forEach((day, i) => {
    if (weightRandom() < 0.3) return
    const trendLb = 194 - (13 * i) / past.length + Math.sin(i / 9) * 1.2
    const lb = trendLb + (weightRandom() - 0.5) * 2.4
    const when = at(day, 6 * 60 + 30 + Math.round(weightRandom() * 60))
    state.weights.push({ id: `wt${i}`, at: stamp(when), kg: Math.round((lb / 2.20462262) * 100) / 100 })
  })

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
