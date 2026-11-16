import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { isMorningDay } from './logins'
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
import { getWorkDays, getWorkStats, isWorkDay, workHeading, workStart } from './work'
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
  // replaces "Good Morning" at the top of the tab, cheering on this week
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
    return {
      line,
      week: getWorkoutWeek(state, today),
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
  // replaces "Good Morning" at the top of the tab
  heading: workHeading,
  start: workStart,
  days: getWorkDays,
  isTracked: isWorkDay,
  showsWeekends: (settings) => settings.workWeekends,
  legend: { miss: 'Under goal', low: 'Goal', high: 'More' },
  yearSummary: (days) => ({ value: countOf(days, 'hit'), label: 'days on goal' }),
  monthCounts: (days) => [
    { value: countOf(days, 'hit'), label: 'on goal' },
    { value: countOf(days, 'partial'), label: 'short' },
    { value: formatDuration(days.reduce((sum, d) => sum + d.minutes, 0)), label: 'total' },
  ],
  describe(day, settings) {
    const date = dateLabel(day.date)
    const goal = formatDuration(settings.workGoalMinutes)
    if (day.minutes > 0) {
      const sofar = day.status === 'pending' ? ' so far' : ''
      return { date, detail: `${formatDuration(day.minutes)}${sofar} · goal ${goal}` }
    }
    const detail = { missed: 'No work logged', pending: 'Not started yet' }[day.status] ?? 'No data'
    return { date, detail }
  },
  summary(state, range, today) {
    const stats = getWorkStats(state, range, today)
    const goal = formatDuration(state.settings.workGoalMinutes)
    const todayDay = getWorkDays(state, today, today)[0]
    let line
    if (!isWorkDay(today, state.settings) && !todayDay) line = 'Enjoy your weekend'
    else if (!todayDay?.minutes) line = `Not started yet · goal ${goal}`
    else if (todayDay.status === 'hit') line = `${formatDuration(todayDay.minutes)} today · goal reached`
    else line = `${formatDuration(todayDay.minutes)} today · goal ${goal}`
    return {
      line,
      streak: { current: stats.currentStreak, best: stats.bestStreak },
      cards: [
        { label: 'Best streak', value: stats.bestStreak },
        {
          label: 'Avg work day',
          value: stats.averageMinutes == null ? '–' : formatDuration(stats.averageMinutes),
        },
      ],
      rate: {
        label: 'Hit rate',
        value: stats.hitRate,
        caption: `${stats.hits} of ${stats.trackedDays} days`,
        counts: [
          { kind: 'hit', value: stats.hits, label: 'on goal' },
          { kind: 'miss', value: stats.partial, label: 'short' },
          { kind: 'miss', value: stats.missed, label: 'missed' },
        ],
      },
    }
  },
}

export const TRACKERS = { morning, workout, work }
export const TRACKER_LIST = [morning, workout, work]

// Tracked days keyed by 'yyyy-MM-dd'
export function daysByDate(tracker, state, from, today) {
  return Object.fromEntries(tracker.days(state, from, today).map((d) => [d.date, d]))
}
