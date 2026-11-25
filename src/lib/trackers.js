import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { getCastleProgress } from './castles'
import { customStart, getCustomDays, getCustomStats, isCustomDoneToday } from './custom'
import { isMorningDay, toDateKey } from './logins'
import {
  formatDuration,
  formatTime12,
  getDays,
  getStats,
  hitLevel,
  rangeStart,
  toMinutes,
  trackingStart,
} from './stats'
import {
  getHoursBars,
  getWorkDays,
  getWorkRecords,
  getWorkStats,
  goalEntryOn,
  goalOn,
  isWorkDay,
  workHeading,
  workStart,
} from './work'
import {
  getWorkoutDays,
  getWorkoutWeek,
  getWorkoutStats,
  getWorkoutWeeks,
  workoutStart,
} from './workouts'

// Everything the dashboard needs to show one tracker. All three share the
// same layout; only the data, the wording and the accent colour differ.
//
// days(state, from, today) → [{ date, status, level?, … }] where status is
//   'hit' (shaded by level 1–4), 'late' | 'partial' | 'missed' (muted tan),
//   'rest' | 'pending' (blank)
// summary(state, range, today) → stat cards, today's line, and either a
//   hit-rate ring (`rate`) or the weekly bar chart (`weekly`)

const dateLabel = (key) => format(parseISO(key), 'EEE, MMM d')
const countOf = (days, status) => days.filter((d) => d.status === status).length

const morning = {
  id: 'morning',
  label: 'Morning',
  editLabel: 'Edit log on time',
  start: trackingStart,
  days: (state, from, today) =>
    getDays(state, from, today).map((d) =>
      d.status === 'hit' ? { ...d, level: hitLevel(d.time, state.settings) } : d,
    ),
  isTracked: isMorningDay,
  showsWeekends: (settings) => settings.morningWeekends,
  legend: { miss: 'Late / missed', low: 'Later', high: 'Earlier' },
  yearSummary: (days) => ({ value: countOf(days, 'hit'), label: 'mornings on target' }),
  monthCounts: (days) => [
    { value: countOf(days, 'hit'), label: 'hit' },
    { value: countOf(days, 'late'), label: 'late' },
    { value: countOf(days, 'missed'), label: 'missed' },
  ],
  describe(day, settings) {
    const date = dateLabel(day.date)
    if (!day.time) {
      const detail = { missed: 'Missed', pending: 'Not logged on yet' }[day.status] ?? 'No data'
      return { date, detail }
    }
    const diff = toMinutes(settings.targetTime) - toMinutes(day.time)
    let when
    if (diff > 0) when = `${diff} min early`
    else if (diff === 0) when = 'right on time'
    else if (day.status === 'hit') when = `${-diff} min past target, within grace`
    else when = `${-diff} min late`
    return { date, detail: `${formatTime12(day.time)} · ${when}` }
  },
  summary(state, range, today) {
    const stats = getStats(state, range, today)
    return {
      streak: { current: stats.currentStreak, best: stats.bestStreak },
      cards: [
        { label: 'Best streak', value: stats.bestStreak },
        { label: 'Avg log on', value: stats.averageTime ?? '–' },
      ],
      rate: {
        label: 'Hit rate',
        value: stats.hitRate,
        caption: `${stats.hits} of ${stats.trackedDays} mornings`,
        counts: [
          { kind: 'hit', value: stats.hits, label: 'hit' },
          { kind: 'miss', value: stats.late, label: 'late' },
          { kind: 'miss', value: stats.missed, label: 'missed' },
        ],
      },
    }
  },
}

const workout = {
  id: 'workout',
  label: 'Workout',
  // clicking a calendar day opens its workouts in a popup
  editLabel: 'Edit workouts',
  // replaces the "Good Morning" greeting at the top of the tab, cheering on this week
  heading(state, today) {
    const days = getWorkoutWeeks(state, today, today).at(-1)?.days ?? 0
    if (days >= state.settings.workoutWeeklyGoal) return 'Goal Crushed!'
    return days > 0 ? 'Keep It Up' : "Let's Lift"
  },
  weekStartsOn: 1,
  // calendar + bar chart come before the year heatmap
  heatmapLast: true,
  start: workoutStart,
  days: getWorkoutDays,
  isTracked: () => true,
  showsWeekends: () => true,
  legend: {
    miss: null,
    steps: [
      { level: 1, label: 'Under goal' },
      { level: 3, label: 'On goal' },
      { level: 5, label: 'Over goal' },
    ],
  },
  yearSummary: (days) => ({ value: countOf(days, 'hit'), label: 'workout days' }),
  monthCounts: (days) => {
    const worked = days.filter((d) => d.status === 'hit')
    return [
      { value: worked.length, label: 'workout days' },
      { value: formatDuration(worked.reduce((sum, d) => sum + d.minutes, 0)), label: 'total' },
    ]
  },
  describe(day, settings) {
    const date = dateLabel(day.date)
    if (day.status === 'hit') {
      const length = formatDuration(day.minutes)
      const workouts = day.count > 1 ? `${day.count} workouts · ${length}` : length
      return { date, detail: `${workouts} · week ${day.weekDays}/${settings.workoutWeeklyGoal}` }
    }
    const detail = { rest: 'Rest day', pending: 'No workout yet' }[day.status] ?? 'No data'
    return { date, detail }
  },
  summary(state, range, today) {
    const stats = getWorkoutStats(state, range, today)
    const goal = state.settings.workoutWeeklyGoal
    const todayDay = getWorkoutDays(state, today, today)[0]
    // the week's progress has its own card, so the line is about the latest workout
    let line
    if (!workoutStart(state)) line = 'No workouts yet'
    else if (todayDay?.status === 'hit') line = `Worked out today · ${formatDuration(todayDay.minutes)}`
    else line = `Last workout ${lastWorkoutLabel(state, today)}`
    const week = getWorkoutWeek(state, today)
    return {
      line,
      week,
      streak: { current: stats.currentStreak, best: stats.bestStreak, unit: 'week' },
      cards: [
        { label: 'Best streak', value: stats.bestStreak, unit: 'week' },
        { label: 'Total workouts', value: state.workouts.length },
      ],
      // shown as the per-week bar chart instead of a hit-rate ring
      weekly: {
        weeks: getWorkoutWeeks(state, rangeStart(range, workoutStart(state), today), today),
        goal,
        counts: [
          { kind: 'hit', value: stats.weeksOnGoal, label: 'on goal' },
          { kind: 'light', value: stats.weeksShort, label: 'short' },
          { kind: null, value: stats.workouts, label: 'workouts' },
        ],
      },
    }
  },
}

// "Since Oct 15" for the goal in effect today (with the year if it's not this
// year), or "Your starting goal" before it was ever changed
function goalSince(settings, today) {
  const entry = goalEntryOn(settings, today)
  if (entry.first) return 'Your starting goal'
  const date = parseISO(entry.from)
  return `Since ${format(date, date.getFullYear() === today.getFullYear() ? 'MMM d' : 'MMM d, yyyy')}`
}

// 'yesterday', 'on Thursday' (this past week) or 'on Oct 3'
function lastWorkoutLabel(state, today) {
  const last = getWorkoutDays(state, workoutStart(state), today).findLast((d) => d.status === 'hit')
  const date = parseISO(last.date)
  const ago = differenceInCalendarDays(today, date)
  if (ago === 1) return 'yesterday'
  return ago < 7 ? `on ${format(date, 'EEEE')}` : `on ${format(date, 'MMM d')}`
}

const work = {
  id: 'work',
  label: 'Work',
  // clicking a calendar day opens that week in the edit popup
  editLabel: 'Edit this week',
  // replaces the "Good Morning" greeting at the top of the tab
  heading: workHeading,
  start: workStart,
  days: getWorkDays,
  isTracked: isWorkDay,
  showsWeekends: (settings) => settings.workWeekends,
  // shaded by total hours (5 steps); the calendar adds a dot on days that met their goal
  legend: { miss: 'No work', low: 'Fewer hours', high: 'More', levels: 5 },
  marksGoal: true,
  yearSummary: (days) => ({ value: countOf(days, 'hit'), label: 'days on goal' }),
  monthCounts: (days) => [
    { value: countOf(days, 'hit'), label: 'goal met', marker: true },
    { value: countOf(days, 'partial'), label: 'short' },
    { value: formatDuration(days.reduce((sum, d) => sum + d.minutes, 0)), label: 'total' },
  ],
  describe(day, settings) {
    const date = dateLabel(day.date)
    const goal = formatDuration(day.goal ?? goalOn(settings, day.date))
    if (day.minutes > 0) {
      const sofar = day.status === 'pending' ? ' so far' : ''
      const met = day.status === 'hit' ? ' · goal met' : ''
      return { date, detail: `${formatDuration(day.minutes)}${sofar} · goal ${goal}${met}` }
    }
    const detail = { missed: 'No work logged', pending: 'Not started yet' }[day.status] ?? 'No data'
    return { date, detail }
  },
  // `now` (ms) lets a running timer count live in today's numbers
  summary(state, range, today, now = Date.now()) {
    const stats = getWorkStats(state, range, today)
    const goalMinutes = goalOn(state.settings, today)
    const goal = formatDuration(goalMinutes)
    const records = getWorkRecords(state, today, now)
    const worked = records.todayMinutes
    const tracked = isWorkDay(today, state.settings)
    let line
    if (!tracked && !worked) line = 'Enjoy your weekend'
    else if (!worked) line = `Not started yet · goal ${goal}`
    else if (worked >= goalMinutes) line = `${formatDuration(worked)} today · goal reached`
    else line = `${formatDuration(worked)} today · goal ${goal}`
    const { longestDay, longestBlock } = records
    const dayLabel = (key) => (key === toDateKey(today) ? 'Today' : format(parseISO(key), 'MMM d, yyyy'))
    return {
      line,
      // still used by the All tab; this tab shows records up top instead
      streak: { current: stats.currentStreak, best: stats.bestStreak },
      streakCard: false,
      cards: [
        { label: "Today's work", value: formatDuration(worked), sub: `of ${goal} goal`, accent: true },
        { label: 'Current goal', value: goal, sub: goalSince(state.settings, today) },
        {
          label: 'Longest day',
          value: longestDay.minutes ? formatDuration(longestDay.minutes) : '–',
          sub: longestDay.date ? dayLabel(longestDay.date) : 'No work yet',
          badge: records.newRecord ? 'New record!' : null,
        },
      ],
      castle: getCastleProgress(state, today, now),
      // the "More stats" card lower on the tab
      extra: [
        { label: 'Current streak', value: stats.currentStreak, unit: 'day', sub: 'in a row on goal' },
        { label: 'Best streak', value: stats.bestStreak, unit: 'day' },
        {
          label: 'Longest block',
          value: longestBlock.minutes ? formatDuration(longestBlock.minutes) : '–',
          sub: longestBlock.date ? `one session · ${dayLabel(longestBlock.date)}` : 'one session',
        },
        { label: 'This week', value: formatDuration(records.weekMinutes) },
        {
          label: 'Avg work day',
          value: stats.averageMinutes == null ? '–' : formatDuration(stats.averageMinutes),
          sub: 'in the selected range',
        },
        { label: 'All time', value: formatDuration(records.totalMinutes) },
      ],
      // shown as the hours vs. goal bar chart instead of a hit-rate ring
      hours: {
        ...getHoursBars(state, range, today),
        counts: [
          { kind: 'hit', value: stats.hits, label: 'goal met' },
          { kind: 'light', value: stats.partial + stats.missed, label: 'short' },
          { kind: null, value: formatDuration(stats.totalMinutes), label: 'total' },
        ],
      },
    }
  },
}

// The custom tracker, built from its setup (`settings.custom`). Same layout as
// Morning: streak + two cards, heatmap, calendar (click a day to check it off
// or clear it) and a hit-rate ring. Every day, or a number of days a week.
function customTracker(custom) {
  if (custom.goal === 'quit') return habitTracker(custom)
  const weekly = custom.goal === 'weekly'
  const period = weekly ? 'week' : 'day'
  return {
    id: 'custom',
    label: custom.name,
    editLabel: 'Check off or clear',
    heading: () => custom.name,
    start: customStart,
    days: getCustomDays,
    isTracked: () => true,
    showsWeekends: () => true,
    weekStartsOn: weekly ? 1 : 0,
    legend: weekly
      ? {
          miss: null,
          steps: [
            { level: 1, label: 'Under goal' },
            { level: 3, label: 'On goal' },
            { level: 5, label: 'Over goal' },
          ],
        }
      : { miss: 'Missed', steps: [{ level: 3, label: 'Done' }] },
    yearSummary: (days) => ({ value: countOf(days, 'hit'), label: 'days done' }),
    monthCounts: (days) =>
      weekly
        ? [{ value: countOf(days, 'hit'), label: 'days done' }]
        : [
            { value: countOf(days, 'hit'), label: 'done' },
            { value: countOf(days, 'missed'), label: 'missed' },
          ],
    describe(day) {
      const date = dateLabel(day.date)
      if (day.status === 'hit') {
        return { date, detail: weekly ? `Done · week ${day.weekDays}/${custom.perWeek}` : 'Done' }
      }
      const detail = { pending: 'Not done yet', missed: 'Not done', rest: 'Not done' }[day.status]
      return { date, detail: detail ?? 'No data' }
    },
    summary(state, range, today) {
      const stats = getCustomStats(state, range, today)
      const doneToday = isCustomDoneToday(state, toDateKey(today))
      let line
      if (doneToday) line = weekly ? `Done today · ${stats.thisWeek} of ${custom.perWeek} this week` : 'Done today'
      else if (weekly) line = `${stats.thisWeek} of ${custom.perWeek} this week`
      else line = 'Not done yet today'
      return {
        line,
        doneToday,
        streak: { current: stats.currentStreak, best: stats.bestStreak, unit: weekly ? 'week' : null },
        cards: [
          { label: 'Best streak', value: stats.bestStreak, unit: weekly ? 'week' : null },
          weekly
            ? { label: 'This week', value: `${stats.thisWeek} / ${custom.perWeek}` }
            : { label: 'Days done', value: stats.totalDays },
        ],
        rate: {
          label: weekly ? 'Weeks on goal' : 'Hit rate',
          value: stats.hitRate,
          caption: `${stats.hits} of ${stats.decided} ${period}s`,
          counts: [
            { kind: 'hit', value: stats.hits, label: weekly ? 'on goal' : 'done' },
            { kind: 'miss', value: stats.misses, label: weekly ? 'short' : 'missed' },
          ],
        },
      }
    },
  }
}

// A custom tracker for breaking a habit: every day since you started counts
// as a win by itself; you only mark the days you slip (the button, or a
// calendar day). Streaks are days on track since the last slip.
function habitTracker(custom) {
  const days = (n) => (n === 1 ? 'day' : 'days')
  return {
    id: 'custom',
    label: custom.name,
    habit: true,
    editLabel: 'Mark or clear a slip',
    heading: () => custom.name,
    start: customStart,
    days: getCustomDays,
    // only days since you started count
    isTracked: (date) => !custom.since || toDateKey(date) >= custom.since,
    showsWeekends: () => true,
    legend: { miss: 'Slipped', steps: [{ level: 3, label: 'On track' }] },
    yearSummary: (list) => ({ value: countOf(list, 'hit'), label: 'days on track' }),
    monthCounts: (list) => [
      { value: countOf(list, 'hit'), label: 'on track' },
      { value: countOf(list, 'missed'), label: 'slipped' },
    ],
    describe(day) {
      const date = dateLabel(day.date)
      if (day.status === 'hit') return { date, detail: 'On track' }
      if (day.status === 'missed') return { date, detail: 'Slipped' }
      return { date, detail: 'Before you started' }
    },
    summary(state, range, today) {
      const stats = getCustomStats(state, range, today)
      const onTrack = isCustomDoneToday(state, toDateKey(today))
      const line = onTrack
        ? `${stats.currentStreak} ${days(stats.currentStreak)} on track`
        : 'Slipped today · tomorrow is a fresh start'
      return {
        line,
        doneToday: onTrack,
        streak: { current: stats.currentStreak, best: stats.bestStreak, unit: 'day' },
        cards: [
          { label: 'Best streak', value: stats.bestStreak, unit: 'day' },
          { label: 'Days on track', value: stats.totalDays },
        ],
        rate: {
          label: 'On track',
          value: stats.hitRate,
          caption: `${stats.hits} of ${stats.decided} days`,
          counts: [
            { kind: 'hit', value: stats.hits, label: 'on track' },
            { kind: 'miss', value: stats.misses, label: 'slipped' },
          ],
        },
      }
    },
  }
}

export const TRACKERS = { morning, workout, work }
export const TRACKER_LIST = [morning, workout, work]

// The built-in trackers plus the custom one when it's set up, by id
export function getTrackers(settings) {
  return settings.custom ? { ...TRACKERS, custom: customTracker(settings.custom) } : TRACKERS
}

// Tracked days keyed by 'yyyy-MM-dd'
export function daysByDate(tracker, state, from, today) {
  return Object.fromEntries(tracker.days(state, from, today).map((d) => [d.date, d]))
}
