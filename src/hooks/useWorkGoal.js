import { useState } from 'react'
import { MAX_WORK_GOAL_MINUTES, MIN_WORK_GOAL_MINUTES, toDateKey } from '../lib/logins'
import { goalOn, nextGoalWeek } from '../lib/work'

// Draft of a new daily work goal, shared by the "Change goal" popup and the
// Work settings (fields in `WorkGoalFields`). `changed` is false while the
// goal is left as it is; `from` is when the new goal starts.
export function useWorkGoal(settings, today) {
  const todayKey = toDateKey(today)
  const mondayKey = nextGoalWeek(today)
  const current = goalOn(settings, todayKey)
  const [hours, setHours] = useState(String(current / 60))
  const [start, setStart] = useState('monday')
  const minutes = Math.round(Number(hours) * 60)
  const valid = hours !== '' && minutes >= MIN_WORK_GOAL_MINUTES && minutes <= MAX_WORK_GOAL_MINUTES
  return {
    todayKey,
    mondayKey,
    current,
    hours,
    setHours,
    start,
    setStart,
    minutes,
    valid,
    changed: valid && minutes !== current,
    from: start === 'monday' ? mondayKey : todayKey,
  }
}

