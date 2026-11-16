import { describe, expect, it } from 'vitest'
import { createInitialState, updateSettings } from './logins'
import { getWorkoutDays, getWorkoutStats, getWorkoutWeeks, workoutLevel } from './workouts'

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

describe('workoutLevel', () => {
  it('grades by length', () => {
    expect(workoutLevel(20)).toBe(1)
    expect(workoutLevel(30)).toBe(2)
    expect(workoutLevel(50)).toBe(3)
    expect(workoutLevel(75)).toBe(4)
  })
})

describe('getWorkoutDays', () => {
  it('marks workout days as hits and the rest as rest days', () => {
    const days = getWorkoutDays(stateWith({ 2: 40, 4: 65 }), day(1), day(5))
    expect(days.map((d) => d.status)).toEqual(['hit', 'rest', 'hit', 'pending'])
    expect(days[0]).toMatchObject({ date: '2026-11-02', minutes: 40, count: 1, level: 2 })
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
