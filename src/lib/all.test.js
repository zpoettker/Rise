import { describe, expect, it } from 'vitest'
import { allHeading, getAllDays, getAllRates, getAllToday, getPerfectDays } from './all'
import { createInitialState, updateSettings } from './logins'

// Nov 2026: Mon 16 … Fri 20, Sat 21, Sun 22
const at = (d, h = 12) => new Date(2026, 10, d, h, 0)

function demoState() {
  const state = updateSettings(createInitialState(), {
    targetTime: '08:30',
    graceMinutes: 0,
    workGoals: [{ from: '2026-01-01', minutes: 60 }],
  })
  // Mon 16: all three · Tue 17: morning late, worked out, work short · Wed 18: morning only
  state.entries = {
    '2026-11-16': { time: '08:00' },
    '2026-11-17': { time: '09:00' },
    '2026-11-18': { time: '08:10' },
  }
  state.workouts = [
    { id: 'a', start: '2026-11-16T18:00', end: '2026-11-16T19:00' },
    { id: 'b', start: '2026-11-17T18:00', end: '2026-11-17T18:40' },
  ]
  state.workSessions = [
    { id: 'x', start: '2026-11-16T09:00', end: '2026-11-16T10:30' },
    { id: 'y', start: '2026-11-17T09:00', end: '2026-11-17T09:20' },
  ]
  return state
}

describe('getAllDays', () => {
  it('marks which trackers hit each day', () => {
    const days = getAllDays(demoState(), at(16), at(18))
    expect(
      days.map(({ date, morning, workout, work, count, perfect }) => [
        date,
        morning,
        workout,
        work,
        count,
        perfect,
      ]),
    ).toEqual([
      ['2026-11-16', true, true, true, 3, true],
      ['2026-11-17', false, true, false, 1, false],
      ['2026-11-18', true, false, false, 1, false],
    ])
  })

  it('is empty without any data', () => {
    expect(getAllDays(createInitialState(), at(1), at(18))).toEqual([])
  })
})

describe('getAllToday', () => {
  it("sums up today's three goals", () => {
    const today = getAllToday(demoState(), at(16), at(16, 20).getTime())
    expect(today.items.map((i) => [i.id, i.done, i.progress])).toEqual([
      ['morning', true, 1],
      // the test week already holds Tuesday's workout too
      ['workout', true, 2 / 3],
      ['work', true, 1],
    ])
    expect(today).toMatchObject({ done: 3, total: 3 })
    expect(allHeading(today)).toBe('Perfect Day')
  })

  it('leaves weekends out when they are off', () => {
    const today = getAllToday(demoState(), at(21), at(21, 20).getTime())
    expect(today.items.map((i) => i.applies)).toEqual([false, true, false])
    // the week has 2 of 3 workouts, none today
    expect(today).toMatchObject({ done: 0, total: 1 })
    expect(allHeading(today)).toBeNull()
  })

  it('cheers on a partly done day', () => {
    const today = getAllToday(demoState(), at(18), at(18, 20).getTime())
    expect(today).toMatchObject({ done: 1, total: 3 })
    expect(allHeading(today)).toBe('Good Start')
  })
})

describe('getPerfectDays', () => {
  it('counts days with all three', () => {
    expect(getPerfectDays(demoState(), 'all', at(18))).toEqual({ count: 1, best: 1 })
  })
})

describe('with some trackers hidden', () => {
  it('only counts the shown ones', () => {
    const state = updateSettings(demoState(), { enabledTrackers: ['morning', 'work'] })
    const today = getAllToday(state, at(18), at(18, 20).getTime())
    expect(today.items.map((i) => i.id)).toEqual(['morning', 'work'])
    expect(today).toMatchObject({ done: 1, total: 2 })
    expect(allHeading(today)).toBe('Almost There')

    const days = getAllDays(state, at(16), at(18))
    expect(days[0]).toEqual({ date: '2026-11-16', morning: true, work: true, count: 2, perfect: true })
    // Tuesday's workout doesn't matter any more; Wednesday was morning only
    expect(days.map((d) => d.perfect)).toEqual([true, false, false])
    expect(getAllRates(state, 'all', at(18)).map((r) => r.id)).toEqual(['morning', 'work'])
  })
})
