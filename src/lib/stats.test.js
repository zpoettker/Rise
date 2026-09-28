import { describe, expect, it } from 'vitest'
import { createInitialState } from './logins'
import { formatMinutes, getDays, getStats, isHit } from './stats'

// Sept 2026: Mon 21 … Fri 25, weekend 26–27, Mon 28, Tue 29
const day = (d) => new Date(2026, 8, d, 12, 0)

function stateWith(entries) {
  const state = createInitialState()
  for (const [d, time] of Object.entries(entries)) {
    state.entries[`2026-09-${String(d).padStart(2, '0')}`] = { time }
  }
  return state
}

describe('isHit', () => {
  const settings = { targetTime: '08:40', graceMinutes: 5 }

  it('counts the grace window as a hit', () => {
    expect(isHit('08:40', settings)).toBe(true)
    expect(isHit('08:45', settings)).toBe(true)
  })

  it('is late after the grace window', () => {
    expect(isHit('08:46', settings)).toBe(false)
  })
})

describe('getDays', () => {
  it('skips weekends and marks unlogged days as missed', () => {
    const state = stateWith({ 24: '08:30', 28: '09:00' })
    expect(getDays(state, day(1), day(28))).toEqual([
      { date: '2026-09-24', status: 'hit', time: '08:30' },
      { date: '2026-09-25', status: 'missed', time: null },
      { date: '2026-09-28', status: 'late', time: '09:00' },
    ])
  })

  it('marks today as pending when not logged yet', () => {
    const state = stateWith({ 28: '08:30' })
    expect(getDays(state, day(28), day(29)).at(-1).status).toBe('pending')
  })

  it('returns nothing before the first login', () => {
    expect(getDays(createInitialState(), day(1), day(29))).toEqual([])
  })
})

describe('getStats streaks', () => {
  it('carries a streak across the weekend and ignores pending today', () => {
    const state = stateWith({ 24: '08:30', 25: '08:40', 28: '08:45' })
    const stats = getStats(state, 'all', day(29))
    expect(stats.currentStreak).toBe(3)
    expect(stats.bestStreak).toBe(3)
  })

  it('resets on a missed day', () => {
    const state = stateWith({ 21: '08:00', 23: '08:00', 24: '08:00' })
    expect(getStats(state, 'all', day(24)).currentStreak).toBe(2)
  })

  it('resets on a late day but keeps the best', () => {
    const state = stateWith({ 21: '08:00', 22: '08:00', 23: '08:00', 24: '09:30', 25: '08:00' })
    const stats = getStats(state, 'all', day(25))
    expect(stats.currentStreak).toBe(1)
    expect(stats.bestStreak).toBe(3)
  })
})

describe('getStats range numbers', () => {
  it('computes hit rate and average within the range', () => {
    // 21 hit, 22 missed, 23 late, 24 hit, today (25) pending
    const state = stateWith({ 21: '08:20', 23: '09:00', 24: '08:40' })
    const stats = getStats(state, '7d', day(25))
    expect(stats.trackedDays).toBe(4)
    expect(stats.hits).toBe(2)
    expect(stats.hitRate).toBe(0.5)
    expect(stats.averageTime).toBe('08:40')
  })

  it('excludes days outside the range', () => {
    const state = stateWith({ 21: '10:00', 28: '08:00' })
    const stats = getStats(state, '7d', day(28)) // 22 → 28
    expect(stats.averageTime).toBe('08:00')
    expect(stats.trackedDays).toBe(5)
  })

  it('handles no data', () => {
    expect(getStats(createInitialState(), '30d', day(28))).toMatchObject({
      currentStreak: 0,
      bestStreak: 0,
      hitRate: null,
      averageTime: null,
    })
  })
})

describe('formatMinutes', () => {
  it('pads and rounds', () => {
    expect(formatMinutes(520.4)).toBe('08:40')
    expect(formatMinutes(65)).toBe('01:05')
  })
})
