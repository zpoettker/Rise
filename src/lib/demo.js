import { eachDayOfInterval, isWeekend, subDays } from 'date-fns'
import { createInitialState, toDateKey } from './logins'
import { formatMinutes, toMinutes } from './stats'

// Fake history for previewing the UI in dev (open the app with ?demo). Never saved.
export function createDemoState(today = new Date()) {
  const state = createInitialState()
  const target = toMinutes(state.settings.targetTime)

  let seed = 42
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647

  for (const day of eachDayOfInterval({ start: subDays(today, 240), end: subDays(today, 1) })) {
    if (isWeekend(day) || random() < 0.08) continue
    const offset = Math.round((random() - 0.72) * 60)
    state.entries[toDateKey(day)] = { time: formatMinutes(target + offset) }
  }
  return state
}
