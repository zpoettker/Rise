import { describe, expect, it } from 'vitest'
import { createInitialState, updateSettings } from './logins'
import { getWorkDays, getWorkStats, workLevel } from './work'

// Nov 2026: Mon 2 … Fri 6, weekend 7–8, Mon 9, Tue 10
const day = (d, h = 23) => new Date(2026, 10, d, h, 0)
const pad = (n) => String(n).padStart(2, '0')

// sessions given as { day: hours } starting at 9 AM; goal defaults to 6h
function stateWith(hours, settings = {}) {
  const state = updateSettings(createInitialState(), settings)
  for (const [d, h] of Object.entries(hours)) {
    const end = 9 * 60 + h * 60
    state.workSessions.push({
      id: d,
      start: `2026-11-${pad(d)}T09:00`,
      end: `2026-11-${pad(d)}T${pad(Math.floor(end / 60))}:${pad(end % 60)}`,
    })
  }
  return state
}

describe('workLevel', () => {
  it('grades hits by time past the goal', () => {
    expect(workLevel(0)).toBe(1)
    expect(workLevel(60)).toBe(2)
    expect(workLevel(150)).toBe(3)
    expect(workLevel(200)).toBe(4)
  })
})

describe('getWorkDays', () => {
  it('classifies weekdays against the goal and skips weekends', () => {
    const state = stateWith({ 5: 7, 6: 3, 7: 4, 10: 2 })
    expect(getWorkDays(state, day(1), day(10)).map((d) => [d.date.slice(8), d.status])).toEqual([
      ['05', 'hit'],
      ['06', 'partial'],
      ['09', 'missed'],
      ['10', 'pending'],
    ])
  })

  it('tracks weekends when turned on', () => {
    const state = stateWith({ 6: 6, 7: 6 }, { workWeekends: true })
    expect(getWorkDays(state, day(1), day(8)).map((d) => d.status)).toEqual(['hit', 'hit', 'pending'])
  })

  it('adds up several sessions in a day', () => {
    const state = stateWith({ 5: 4 })
    state.workSessions.push({ id: 'b', start: '2026-11-05T14:00', end: '2026-11-05T16:30' })
    expect(getWorkDays(state, day(5), day(5))[0]).toMatchObject({ status: 'hit', minutes: 390 })
  })
})

describe('getWorkStats', () => {
  it('streaks across the weekend and breaks on a short day', () => {
    const state = stateWith({ 2: 6, 3: 3, 4: 6, 5: 6, 6: 7, 9: 6.5 })
    const stats = getWorkStats(state, 'all', day(10))
    expect(stats.currentStreak).toBe(4)
    expect(stats.bestStreak).toBe(4)
    expect(stats.partial).toBe(1)
    expect(stats.averageMinutes).toBeCloseTo((6 + 3 + 6 + 6 + 7 + 6.5) * 10)
  })
})
