import { eachDayOfInterval, isWeekend, subDays } from 'date-fns'
import { createInitialState, toDateKey } from './logins'
import { formatMinutes, toMinutes } from './stats'

// Fake history for previewing the UI in dev (open the app with ?demo). Never saved.
// `hitToday` adds an early log-on today (used by ?demo&celebrate).
export function createDemoState(today = new Date(), { hitToday = false } = {}) {
  const state = createInitialState()
  const target = toMinutes(state.settings.targetTime)

  let seed = 42
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647

  for (const day of eachDayOfInterval({ start: subDays(today, 240), end: subDays(today, 1) })) {
    if (isWeekend(day) || random() < 0.08) continue
    const offset = Math.round((random() - 0.6) * 60)
    state.entries[toDateKey(day)] = { time: formatMinutes(target + offset) }
  }
  if (hitToday && !isWeekend(today)) state.entries[toDateKey(today)] = { time: formatMinutes(target - 18) }
  return state
}
