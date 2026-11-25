import { eachDayOfInterval, min, parseISO, startOfDay } from 'date-fns'
import { isMorningDay, toDateKey, TRACKER_IDS } from './logins'
import {
  formatDuration,
  formatTime12,
  getDays,
  getStats,
  isHit,
  rangeStart,
  toMinutes,
  trackingStart,
} from './stats'
import { getWorkDays, getWorkRecords, getWorkStats, goalOn, isWorkDay, workStart } from './work'
import { getWorkoutDays, getWorkoutStats, getWorkoutWeek, workoutStart } from './workouts'
import { customStart, getCustomDays, getCustomStats, isCustomDoneToday } from './custom'

// The All tab: the shown trackers side by side (`settings.enabledTrackers`).
// Each keeps its own colour on a neutral page; "done" means the tracker's
// goal is taken care of for today.

export { TRACKER_IDS }
const enabledOf = (state) => state.settings.enabledTrackers ?? TRACKER_IDS

// Today for each tracker: whether it counts today (`applies`), whether it's
// done, a 0–1 `progress` for its ring, and the words for its row.
//   morning: logged on by the target (+ grace)
//   workout: worked out today, or the week's goal is already met (ring = week)
//   work: today's hours reached the goal (ring = hours / goal, live timer included)
export function getAllToday(state, today = new Date(), now = Date.now()) {
  const { settings } = state
  const key = toDateKey(today)

  const entry = state.entries[key]
  const morningDays = isMorningDay(today, settings)
  const morningHit = Boolean(entry && isHit(entry.time, settings))
  let morningDetail
  if (entry) {
    const diff = toMinutes(settings.targetTime) - toMinutes(entry.time)
    morningDetail = diff >= 0 ? (diff ? `${diff} min early` : 'right on time') : `${-diff} min late`
  } else
    morningDetail = morningDays ? `target ${formatTime12(settings.targetTime)}` : 'Weekend · off'
  const morning = {
    id: 'morning',
    label: 'Morning',
    applies: morningDays || Boolean(entry),
    done: morningHit,
    progress: morningHit ? 1 : 0,
    value: entry ? formatTime12(entry.time) : 'Not yet',
    detail: morningDetail,
  }

  const week = getWorkoutWeek(state, today)
  const workedToday = week.days.find((d) => d.date === key)?.worked ?? false
  const weekMet = week.workoutDays >= week.goal
  const workout = {
    id: 'workout',
    label: 'Workout',
    applies: true,
    done: workedToday || weekMet,
    progress: Math.min(1, week.workoutDays / week.goal),
    value: `${week.workoutDays} / ${week.goal}`,
    detail: workedToday
      ? 'this week · worked out today'
      : weekMet
        ? 'this week · goal met'
        : 'days this week',
  }

  const minutes = getWorkRecords(state, today, now).todayMinutes
  const goal = goalOn(settings, key)
  const workDay = isWorkDay(today, settings)
  const work = {
    id: 'work',
    label: 'Work',
    applies: workDay || minutes > 0,
    done: minutes >= goal,
    progress: Math.min(1, minutes / goal),
    value: formatDuration(minutes),
    detail: workDay ? `of ${formatDuration(goal)} goal` : 'Weekend · off',
  }

  const items = [morning, workout, work]
  const custom = settings.custom
  if (custom) {
    const doneToday = isCustomDoneToday(state, key)
    const weekly = custom.goal === 'weekly'
    const habit = custom.goal === 'quit'
    const streak = habit ? getCustomStats(state, '7d', today).currentStreak : 0
    const thisWeek = weekly ? getCustomStats(state, '7d', today).thisWeek : 0
    items.push({
      id: 'custom',
      label: custom.name,
      applies: true,
      // like workouts, a weekly goal that's already met counts as done
      done: doneToday || (weekly && thisWeek >= custom.perWeek),
      progress: weekly ? Math.min(1, thisWeek / custom.perWeek) : doneToday ? 1 : 0,
      value: habit
        ? doneToday
          ? `${streak} ${streak === 1 ? 'day' : 'days'}`
          : 'Slipped'
        : weekly
          ? `${thisWeek} / ${custom.perWeek}`
          : doneToday
            ? 'Done'
            : 'Not yet',
      detail: habit
        ? doneToday
          ? 'on track'
          : 'tomorrow is a fresh start'
        : weekly
          ? doneToday
            ? 'this week · done today'
            : 'days this week'
          : 'every day',
    })
  }
  const enabled = enabledOf(state)
  const shown = items.filter((i) => enabled.includes(i.id))
  const counted = shown.filter((i) => i.applies)
  return { items: shown, done: counted.filter((i) => i.done).length, total: counted.length }
}

// The tab's heading from how today is going
export function allHeading(today) {
  if (today.total && today.done === today.total) return 'Perfect Day'
  if (today.done === 0) return null // falls back to the greeting
  return today.total - today.done === 1 ? 'Almost There' : 'Good Start'
}

// Every day from `from` to `today` (from the first data of any shown
// tracker): which trackers hit that day. Morning = on target, workout =
// worked out, work = goal met. `perfect` when every shown tracker hit.
export function getAllDays(state, from, today = new Date()) {
  const enabled = enabledOf(state)
  const startOf = {
    morning: trackingStart,
    workout: workoutStart,
    work: workStart,
    custom: customStart,
  }
  const starts = enabled.map((id) => startOf[id](state)).filter(Boolean)
  if (!starts.length) return []
  const first = startOfDay(from) < min(starts) ? min(starts) : startOfDay(from)
  const last = startOfDay(today)
  if (first > last) return []

  const daysOf = {
    morning: getDays,
    workout: getWorkoutDays,
    work: getWorkDays,
    custom: getCustomDays,
  }
  const hits = Object.fromEntries(
    enabled.map((id) => [
      id,
      new Set(
        daysOf[id](state, first, today)
          .filter((d) => d.status === 'hit')
          .map((d) => d.date),
      ),
    ]),
  )

  return eachDayOfInterval({ start: first, end: last }).map((day) => {
    const date = toDateKey(day)
    const hit = Object.fromEntries(enabled.map((id) => [id, hits[id].has(date)]))
    const count = enabled.filter((id) => hit[id]).length
    return { date, ...hit, count, perfect: count === enabled.length }
  })
}

// Each shown tracker's success rate over the range, in its own terms
export function getAllRates(state, range, today = new Date()) {
  const morning = getStats(state, range, today)
  const workout = getWorkoutStats(state, range, today)
  const work = getWorkStats(state, range, today)
  const enabled = enabledOf(state)
  const rates = [
    {
      id: 'morning',
      label: 'Morning',
      rate: morning.hitRate,
      caption: `${morning.hits} of ${morning.trackedDays} mornings on target`,
    },
    {
      id: 'workout',
      label: 'Workout',
      rate: workout.hitRate,
      caption: `${workout.weeksOnGoal} of ${workout.trackedWeeks} weeks on goal`,
    },
    {
      id: 'work',
      label: 'Work',
      rate: work.hitRate,
      caption: `${work.hits} of ${work.trackedDays} days on goal`,
    },
  ]
  const custom = state.settings.custom
  if (custom) {
    const stats = getCustomStats(state, range, today)
    const period = custom.goal === 'weekly' ? 'weeks on goal' : 'days done'
    rates.push({
      id: 'custom',
      label: custom.name,
      rate: stats.hitRate,
      caption: `${stats.hits} of ${stats.decided} ${period}`,
    })
  }
  return rates.filter((r) => enabled.includes(r.id))
}

// Perfect days (every shown tracker hit) in the range, and the longest run of them
export function getPerfectDays(state, range, today = new Date()) {
  const all = getAllDays(state, new Date(0), today)
  if (!all.length) return { count: 0, best: 0 }
  const from = toDateKey(rangeStart(range, parseISO(all[0].date), today))
  let run = 0
  let best = 0
  for (const d of all) {
    run = d.perfect ? run + 1 : 0
    best = Math.max(best, run)
  }
  return { count: all.filter((d) => d.perfect && d.date >= from).length, best }
}
