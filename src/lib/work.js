import {
  addDays,
  addMinutes,
  eachDayOfInterval,
  format,
  isWeekend,
  max,
  nextMonday,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { dayOf, toDateKey } from './logins'
import { firstDay, spanDay, spanMinutes, totalsByDay } from './spans'
import { rangeStart, streaks } from './stats'

// Work is timed in sessions; a day is a hit once its sessions add up to the
// daily goal. Weekends are only tracked when turned on.

export const isWorkDay = (date, settings) => settings.workWeekends || !isWeekend(date)

// The daily goal (minutes) in effect on a day ('yyyy-MM-dd' or a Date)
export function goalOn(settings, day) {
  const key = typeof day === 'string' ? day : toDateKey(day)
  const goals = settings.workGoals
  let goal = goals[0].minutes
  for (const g of goals) {
    if (g.from <= key) goal = g.minutes
    else break
  }
  return goal
}

// The goal entry in effect on a day: { from, minutes, first } (`first` means
// it's the starting goal, which has no real start date)
export function goalEntryOn(settings, day) {
  const key = typeof day === 'string' ? day : toDateKey(day)
  const goals = settings.workGoals
  let index = 0
  goals.forEach((g, i) => {
    if (g.from <= key) index = i
  })
  return { ...goals[index], first: index === 0 }
}

// Sets the daily goal from a day onward. Earlier days keep the goal they had;
// a change already starting that same day is replaced.
export function setWorkGoal(state, minutes, from) {
  const goals = state.settings.workGoals.filter((g) => g.from !== from)
  goals.push({ from, minutes })
  goals.sort((a, b) => (a.from < b.from ? -1 : 1))
  return { ...state, settings: { ...state.settings, workGoals: goals } }
}

// Sets the goal for a whole Mon–Sun week (`weekStart`), either for that week
// only (the goal in effect the Monday after is put back) or from that week
// on (until the next later change). Changes that started inside the week are
// folded in, so every day of it gets the new goal. Back-to-back entries with
// the same goal are merged.
export function setWeekGoal(settings, weekStart, minutes, scope = 'week') {
  const nextWeek = toDateKey(addDays(parseISO(weekStart), 7))
  const after = goalOn(settings, nextWeek)
  let goals = settings.workGoals.filter((g) => !(g.from >= weekStart && g.from < nextWeek))
  goals.push({ from: weekStart, minutes })
  if (scope === 'week' && !goals.some((g) => g.from === nextWeek)) {
    goals.push({ from: nextWeek, minutes: after })
  }
  goals.sort((a, b) => (a.from < b.from ? -1 : 1))
  goals = goals.filter((g, i) => i === 0 || g.minutes !== goals[i - 1].minutes)
  return { ...settings, workGoals: goals }
}

// Where a goal change starts by default: the coming Monday (even on a
// Monday), so the week in progress keeps the goal it started with.
export const nextGoalWeek = (today = new Date()) => toDateKey(nextMonday(startOfDay(today)))

export const workStart = (state) => firstDay(totalsByDay(state.workSessions, state.settings))

// How strongly a day with work is shaded, by total hours (not the goal), so
// the charts darken as the hours grow: 1 (under 2h) → 5 (8h or more).
export function workLevel(minutes) {
  if (minutes >= 8 * 60) return 5
  if (minutes >= 6 * 60) return 4
  if (minutes >= 4 * 60) return 3
  if (minutes >= 2 * 60) return 2
  return 1
}

// Every tracked day from `from` to `today` (clamped to the first session):
// 'hit' (that day's goal reached), 'partial' (some time, under goal), 'missed'
// (none), or 'pending' (today, goal not reached yet). Days with work carry a
// `level` from their hours, used for shading whether or not the goal was met.
export function getWorkDays(state, from, today = new Date()) {
  const totals = totalsByDay(state.workSessions, state.settings)
  const start = firstDay(totals)
  if (!start) return []

  const first = max([startOfDay(from), start])
  const last = startOfDay(today)
  if (first > last) return []

  const todayKey = toDateKey(today)
  return eachDayOfInterval({ start: first, end: last })
    .filter((day) => isWorkDay(day, state.settings))
    .map((day) => {
      const date = toDateKey(day)
      const minutes = totals[date]?.minutes ?? 0
      const goal = goalOn(state.settings, date)
      const level = minutes > 0 ? workLevel(minutes) : undefined
      if (minutes >= goal) return { date, status: 'hit', level, minutes, goal }
      if (date === todayKey) return { date, status: 'pending', level, minutes, goal }
      return { date, status: minutes > 0 ? 'partial' : 'missed', level, minutes, goal }
    })
}

// Under this much logged today still counts as just getting started
export const WARM_UP_MINUTES = 30

// The Work tab's heading: the goal reached wins, then a running timer, then
// how much is logged today.
export function workHeading(state, today = new Date()) {
  const minutes = totalsByDay(state.workSessions, state.settings)[toDateKey(today)]?.minutes ?? 0
  if (minutes >= goalOn(state.settings, today)) return 'Brick by Brick'
  if (state.timer?.startedAt) return 'Flow State'
  return minutes >= WARM_UP_MINUTES ? 'In the Zone' : 'Time to Build'
}

// Ranges long enough that one bar per day would be too thin
const WEEKLY_RANGES = ['90d', 'all']

// Bars for the hours chart over a range: one per tracked day, or per Mon–Sun
// week (average per tracked day) for long ranges. Each bar has `minutes`, the
// `goal` it's measured against and whether it was `met`; weeks also count
// `metDays` of `days`. Today only counts while it's still under way if it has
// time logged, so a fresh morning doesn't drag the week's average down.
export function getHoursBars(state, range = '30d', today = new Date()) {
  const days = getWorkDays(state, rangeStart(range, workStart(state), today), today)
  if (!WEEKLY_RANGES.includes(range)) {
    return {
      by: 'day',
      bars: days.map((d) => ({
        key: d.date,
        minutes: d.minutes,
        goal: d.goal,
        met: d.status === 'hit',
        pending: d.status === 'pending',
      })),
    }
  }

  const weeks = new Map()
  for (const d of days) {
    if (d.status === 'pending' && !d.minutes) continue
    const key = toDateKey(startOfWeek(parseISO(d.date), { weekStartsOn: 1 }))
    if (!weeks.has(key)) weeks.set(key, [])
    weeks.get(key).push(d)
  }
  return {
    by: 'week',
    bars: [...weeks].map(([key, list]) => {
      const minutes = list.reduce((sum, d) => sum + d.minutes, 0) / list.length
      const goal = list.reduce((sum, d) => sum + d.goal, 0) / list.length
      const metDays = list.filter((d) => d.status === 'hit').length
      return { key, minutes, goal, met: minutes >= goal, metDays, days: list.length }
    }),
  }
}

// The stretch the timer is on right now, as { day, minutes } (live), or null
function runningStretch(state, now) {
  const startedAt = state.timer?.startedAt
  if (!startedAt || now < startedAt) return null
  const day = toDateKey(dayOf(new Date(startedAt), state.settings))
  return { day, minutes: Math.floor((now - startedAt) / 60000) }
}

// Today's total and the all-time records, counting a running timer live:
// the longest day (and whether today just beat it), the longest single block
// of work, plus this week's and all-time totals.
export function getWorkRecords(state, today = new Date(), now = Date.now()) {
  const { settings } = state
  const todayKey = toDateKey(today)
  const totals = totalsByDay(state.workSessions, settings)
  const running = runningStretch(state, now)
  const dayMinutes = (key) => (totals[key]?.minutes ?? 0) + (running?.day === key ? running.minutes : 0)

  const todayMinutes = dayMinutes(todayKey)
  let best = { minutes: 0, date: null } // longest day before today
  for (const [key, { minutes }] of Object.entries(totals)) {
    if (key !== todayKey && minutes > best.minutes) best = { minutes, date: key }
  }
  const newRecord = best.minutes > 0 && todayMinutes > best.minutes
  const longestDay = todayMinutes > best.minutes ? { minutes: todayMinutes, date: todayKey } : best

  let longestBlock = { minutes: 0, date: null }
  for (const span of state.workSessions) {
    const minutes = spanMinutes(span)
    if (minutes > longestBlock.minutes) longestBlock = { minutes, date: spanDay(span, settings) }
  }
  if (running && running.minutes > longestBlock.minutes) longestBlock = { ...running, date: running.day }

  const weekStart = toDateKey(startOfWeek(today, { weekStartsOn: 1 }))
  let weekMinutes = running && running.day >= weekStart ? running.minutes : 0
  let totalMinutes = running?.minutes ?? 0
  for (const [key, { minutes }] of Object.entries(totals)) {
    totalMinutes += minutes
    if (key >= weekStart && key <= todayKey) weekMinutes += minutes
  }

  return { todayMinutes, longestDay, newRecord, longestBlock, weekMinutes, totalMinutes }
}

// Default hours the timeline shows; it widens to fit sessions outside them
const TIMELINE_FROM = 6 * 60
const TIMELINE_TO = 22 * 60

// How a timeline block is shaded, by its length: 1 (under 30m) → 4 (2h+)
export function blockLevel(minutes) {
  if (minutes >= 120) return 4
  if (minutes >= 60) return 3
  if (minutes >= 30) return 2
  return 1
}

// A Mon–Sun week (the one holding `weekOf`, this week by default) as a
// timeline: each day's sessions as blocks in minutes
// from that day's midnight (a session after midnight that still belongs to
// the day, before the day start, goes past 24:00), the running stretch live,
// plus each day's total and goal. `from` / `to` is the span of hours to draw,
// on whole hours.
export function getWeekTimeline(state, today = new Date(), now = Date.now(), weekOf = today) {
  const { settings } = state
  const monday = startOfWeek(weekOf, { weekStartsOn: 1 })
  const todayKey = toDateKey(today)
  const minuteOf = (date, dayKey) => (date - parseISO(dayKey)) / 60000

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = toDateKey(addDays(monday, i))
    return { date, blocks: [], minutes: 0, goal: goalOn(settings, date), today: date === todayKey, future: date > todayKey }
  })
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]))

  for (const span of state.workSessions) {
    const day = byDate[spanDay(span, settings)]
    if (!day) continue
    const start = minuteOf(parseISO(span.start), day.date)
    const minutes = spanMinutes(span)
    day.blocks.push({ start, end: start + minutes, minutes, level: blockLevel(minutes) })
  }
  const running = runningStretch(state, now)
  if (running && byDate[running.day]) {
    const day = byDate[running.day]
    const start = minuteOf(new Date(state.timer.startedAt), day.date)
    const { minutes } = running
    day.blocks.push({ start, end: start + minutes, minutes, level: blockLevel(minutes), running: true })
  }

  let from = TIMELINE_FROM
  let to = TIMELINE_TO
  for (const day of days) {
    day.blocks.sort((a, b) => a.start - b.start)
    day.minutes = day.blocks.reduce((sum, b) => sum + b.minutes, 0)
    day.met = day.minutes >= day.goal
    for (const b of day.blocks) {
      from = Math.min(from, Math.floor(b.start / 60) * 60)
      to = Math.max(to, Math.ceil(b.end / 60) * 60)
    }
  }
  const nowMinute = minuteOf(new Date(now), toDateKey(dayOf(new Date(now), settings)))
  return { start: toDateKey(monday), days, from, to, now: nowMinute }
}

// Editing a week on the timeline works on plain blocks: { id, day, start,
// end } with start/end in minutes from that day's midnight (like the
// timeline). These convert a week's sessions to blocks and back.

// The saved sessions in the Mon–Sun week starting `weekStart` ('yyyy-MM-dd')
export function weekBlocks(state, weekStart) {
  const days = Array.from({ length: 7 }, (_, i) => toDateKey(addDays(parseISO(weekStart), i)))
  const blocks = []
  for (const span of state.workSessions) {
    const day = spanDay(span, state.settings)
    if (!days.includes(day)) continue
    const start = (parseISO(span.start) - parseISO(day)) / 60000
    blocks.push({ id: span.id, day, start, end: start + spanMinutes(span) })
  }
  return blocks.sort((a, b) => a.day.localeCompare(b.day) || a.start - b.start)
}

// Replaces the week's sessions with `blocks` (edited, added or removed);
// sessions outside the week are left alone.
export function applyWeekBlocks(state, weekStart, blocks) {
  const days = new Set(Array.from({ length: 7 }, (_, i) => toDateKey(addDays(parseISO(weekStart), i))))
  const stamp = (day, minute) => format(addMinutes(parseISO(day), minute), "yyyy-MM-dd'T'HH:mm")
  const kept = state.workSessions.filter((s) => !days.has(spanDay(s, state.settings)))
  const edited = blocks
    .filter((b) => b.end > b.start)
    .map((b) => ({ id: b.id, start: stamp(b.day, b.start), end: stamp(b.day, b.end) }))
  return { ...state, workSessions: [...kept, ...edited] }
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
