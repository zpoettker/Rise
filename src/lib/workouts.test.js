import { describe, expect, it } from 'vitest'
import { createInitialState, updateSettings } from './logins'
import {
  getWorkoutDays,
  getWorkoutWeek,
  getWorkoutStats,
  getWorkoutWeeks,
  overlappingWorkouts,
  placeWorkout,
  setDayWorkouts,
  weekLevel,
  workoutsOn,
} from './workouts'
import { TRACKERS } from './trackers'

// Nov 2026: Mon 2 … Sun 8, Mon 9 … Sun 15, Mon 16 … Sun 22
const day = (d, h = 12) => new Date(2026, 10, d, h, 0)
const pad = (n) => String(n).padStart(2, '0')

// workouts given as { day: minutes } (or [minutes, startHour]), all starting at 6 PM
function stateWith(workouts, settings = {}) {
  const state = updateSettings(createInitialState(), settings)
  for (const [d, value] of Object.entries(workouts)) {
    const [minutes, hour = 18] = Array.isArray(value) ? value : [value]
    const end = hour * 60 + minutes
    state.workouts.push({
      id: d,
      start: `2026-11-${pad(d)}T${pad(hour)}:00`,
      end: `2026-11-${pad(d)}T${pad(Math.floor(end / 60))}:${pad(end % 60)}`,
    })
  }
  return state
}

describe('getWorkoutWeek', () => {
  it("sums this week's workout days and the days left", () => {
    // Fri Nov 13; last week's workout doesn't count
    const week = getWorkoutWeek(stateWith({ 6: 30, 9: 40, 11: 20 }), day(13))
    expect(week).toMatchObject({ start: '2026-11-09', end: '2026-11-15', goal: 3 })
    expect(week).toMatchObject({ workoutDays: 2, minutes: 60, daysLeft: 3 })
    expect(week.days.map((d) => d.worked)).toEqual([true, false, true, false, false, false, false])
    expect(week.days.map((d) => d.future)).toEqual([false, false, false, false, false, true, true])
  })
})

describe('weekLevel', () => {
  it('grades by the week against the goal', () => {
    expect(weekLevel(2, 3)).toBe(1)
    expect(weekLevel(3, 3)).toBe(3)
    expect(weekLevel(4, 3)).toBe(5)
  })
})

describe('getWorkoutDays', () => {
  it('marks workout days as hits and the rest as rest days', () => {
    const days = getWorkoutDays(stateWith({ 2: 40, 4: 65 }), day(1), day(5))
    expect(days.map((d) => d.status)).toEqual(['hit', 'rest', 'hit', 'pending'])
    expect(days[0]).toMatchObject({ date: '2026-11-02', minutes: 40, count: 1, weekDays: 2, level: 1 })
  })

  it('shades every workout in a week by that week against the goal', () => {
    const goal = { workoutWeeklyGoal: 2 }
    // week of Nov 2: 1 day (under), Nov 9: 2 (on goal), Nov 16: 3 (over)
    const state = stateWith({ 3: 30, 10: 30, 12: 30, 16: 30, 18: 30, 20: 30 }, goal)
    const levels = getWorkoutDays(state, day(1), day(22))
      .filter((d) => d.status === 'hit')
      .map((d) => d.level)
    expect(levels).toEqual([1, 3, 3, 5, 5, 5])
  })

  it('puts a workout after midnight on the night before', () => {
    const state = stateWith({ 2: 30, 3: [45, 1] })
    expect(getWorkoutDays(state, day(1), day(3))[0]).toMatchObject({ count: 2, minutes: 75 })
  })
})

describe('getWorkoutWeeks', () => {
  it('counts workout days per Mon–Sun week against the goal', () => {
    const state = stateWith({ 2: 40, 4: 40, 6: 40, 10: 40, 17: 40 })
    expect(getWorkoutWeeks(state, day(1), day(18))).toEqual([
      { start: '2026-11-02', days: 3, minutes: 120, status: 'hit' },
      { start: '2026-11-09', days: 1, minutes: 40, status: 'missed' },
      { start: '2026-11-16', days: 1, minutes: 40, status: 'pending' },
    ])
  })

  it('counts two workouts on one day as one day', () => {
    const state = stateWith({ 2: 40 })
    state.workouts.push({ id: 'x', start: '2026-11-02T07:00', end: '2026-11-02T07:30' })
    expect(getWorkoutWeeks(state, day(1), day(8))[0].days).toBe(1)
  })
})

describe('getWorkoutStats', () => {
  it('streaks by week and ignores an unfinished week', () => {
    // weeks of 2nd and 9th meet a goal of 2; this week (16th) has one so far
    const state = stateWith({ 2: 40, 5: 40, 9: 40, 13: 40, 17: 40 }, { workoutWeeklyGoal: 2 })
    const stats = getWorkoutStats(state, 'all', day(18))
    expect(stats.currentStreak).toBe(2)
    expect(stats.bestStreak).toBe(2)
    expect(stats.thisWeekDays).toBe(1)
    expect(stats.hitRate).toBe(1)
    expect(stats.workouts).toBe(5)
  })

  it('a short week breaks the streak', () => {
    const state = stateWith({ 2: 40, 4: 40, 6: 40, 10: 40, 16: 40, 17: 40, 18: 40 })
    const stats = getWorkoutStats(state, 'all', day(19))
    expect(stats.currentStreak).toBe(1)
    expect(stats.bestStreak).toBe(1)
    expect(stats.weeksShort).toBe(1)
  })

  it('handles no data', () => {
    expect(getWorkoutStats(createInitialState(), '30d', day(18))).toMatchObject({
      currentStreak: 0,
      hitRate: null,
      thisWeekDays: 0,
      averageMinutes: null,
    })
  })
})

describe('workout heading', () => {
  const heading = (workouts) => TRACKERS.workout.heading(stateWith(workouts), day(13))

  it('cheers on this week against the goal (default 3)', () => {
    expect(heading({ 3: 30 })).toBe("Let's Lift") // only last week
    expect(heading({ 10: 30, 11: 30 })).toBe('Keep It Up')
    expect(heading({ 9: 30, 11: 30, 13: 30 })).toBe('Goal Crushed!')
  })
})

describe('editing a day', () => {
  it('lists the day\'s workouts as clock times, earliest first', () => {
    const state = stateWith({ 9: [40, 18], 10: 30 })
    state.workouts.push({ id: 'early', start: '2026-11-09T07:00', end: '2026-11-09T07:30' })
    // 2 AM on the 10th still belongs to the 9th (day starts at 4 AM)
    state.workouts.push({ id: 'late', start: '2026-11-10T02:00', end: '2026-11-10T02:45' })
    expect(workoutsOn(state, '2026-11-09')).toEqual([
      { id: 'early', start: '07:00', end: '07:30' },
      { id: '9', start: '18:00', end: '18:40' },
      { id: 'late', start: '02:00', end: '02:45' },
    ])
  })

  it('places times after midnight on the night after, and ends past midnight', () => {
    const settings = createInitialState().settings
    expect(placeWorkout({ start: '18:00', end: '19:15' }, settings)).toEqual({
      start: 1080,
      end: 1155,
      minutes: 75,
    })
    expect(placeWorkout({ start: '23:30', end: '00:30' }, settings).minutes).toBe(60)
    expect(placeWorkout({ start: '01:00', end: '02:00' }, settings).start).toBe(25 * 60)
  })

  it('finds overlapping rows', () => {
    const settings = createInitialState().settings
    const rows = [
      { id: 'a', start: '07:00', end: '08:00' },
      { id: 'b', start: '07:30', end: '08:30' },
      { id: 'c', start: '08:30', end: '09:00' },
    ]
    expect([...overlappingWorkouts(rows, settings)].sort()).toEqual(['a', 'b'])
  })

  it("replaces only that day's workouts", () => {
    const state = stateWith({ 9: 40, 10: 30 })
    const next = setDayWorkouts(state, '2026-11-09', [
      { id: 'x', start: '06:30', end: '07:15' },
      { id: 'y', start: '23:30', end: '00:15' },
    ])
    expect(next.workouts).toEqual([
      { id: '10', start: '2026-11-10T18:00', end: '2026-11-10T18:30' },
      { id: 'x', start: '2026-11-09T06:30', end: '2026-11-09T07:15' },
      { id: 'y', start: '2026-11-09T23:30', end: '2026-11-10T00:15' },
    ])
    expect(setDayWorkouts(state, '2026-11-09', []).workouts.map((w) => w.id)).toEqual(['10'])
  })
})
