import { describe, expect, it } from 'vitest'
import {
  getCustomDays,
  getCustomStats,
  getCustomWeeks,
  isCustomDoneToday,
  toggleCustomDay,
  toggleCustomSlip,
} from './custom'
import { readCustom, readCustomLog } from './customConfig'
import { createBackup, createInitialState, parseBackup, readEnabledTrackers } from './logins'

// Nov 2026: Mon 9 … Sun 15, Mon 16 … Sun 22
const at = (d) => new Date(2026, 10, d, 12)

function withCustom(custom, days) {
  const state = createInitialState()
  state.settings.custom = {
    name: 'Reading',
    icon: 'book',
    color: 'violet',
    goal: 'daily',
    perWeek: 3,
    since: null,
    ...custom,
  }
  for (const d of days) state.customLog[`2026-11-${String(d).padStart(2, '0')}`] = true
  return state
}

describe('custom tracker: every day', () => {
  it('marks done, missed and pending days from the first check-off', () => {
    const state = withCustom({}, [16, 17, 19])
    expect(getCustomDays(state, at(1), at(20)).map((d) => d.status)).toEqual([
      'hit',
      'hit',
      'missed',
      'hit',
      'pending',
    ])
  })

  it('counts streaks in days and the rate over the range', () => {
    const state = withCustom({}, [14, 15, 16, 18, 19])
    const stats = getCustomStats(state, 'all', at(20))
    // today (20th) isn't done yet but doesn't break the run of 18–19
    expect(stats).toMatchObject({
      currentStreak: 2,
      bestStreak: 3,
      hits: 5,
      decided: 6,
      totalDays: 5,
    })
  })
})

describe('custom tracker: days a week', () => {
  it('shades done days by their week and leaves the rest as rest days', () => {
    const state = withCustom({ goal: 'weekly', perWeek: 2 }, [9, 11, 13, 16])
    const days = getCustomDays(state, at(9), at(17))
    expect(days[0]).toMatchObject({ status: 'hit', level: 5, weekDays: 3 })
    expect(days[1].status).toBe('rest')
    expect(days.at(-1).status).toBe('pending')
    expect(getCustomWeeks(state, at(9), at(17)).map((w) => [w.days, w.status])).toEqual([
      [3, 'hit'],
      [1, 'pending'],
    ])
    expect(getCustomStats(state, 'all', at(17))).toMatchObject({ currentStreak: 1, thisWeek: 1 })
  })
})

describe('custom tracker: break a habit', () => {
  // counting from Nov 14; slipped on the 17th
  const habit = () => {
    const state = withCustom({ goal: 'quit', since: '2026-11-14' }, [])
    state.customSlips = { '2026-11-17': true }
    return state
  }

  it('counts every day since the start as on track unless it was a slip', () => {
    const days = getCustomDays(habit(), at(1), at(20))
    expect(days.map((d) => d.status)).toEqual(['hit', 'hit', 'hit', 'missed', 'hit', 'hit', 'hit'])
  })

  it('counts the streak since the last slip, today included', () => {
    const stats = getCustomStats(habit(), 'all', at(20))
    expect(stats).toMatchObject({ currentStreak: 3, bestStreak: 3, hits: 6, misses: 1, totalDays: 6 })
  })

  it('marks and clears a slip, and today counts as done unless slipped', () => {
    const slipped = toggleCustomSlip(habit(), '2026-11-20')
    expect(isCustomDoneToday(habit(), '2026-11-20')).toBe(true)
    expect(isCustomDoneToday(slipped, '2026-11-20')).toBe(false)
    expect(getCustomStats(slipped, 'all', at(20)).currentStreak).toBe(0)
    expect(toggleCustomSlip(slipped, '2026-11-20').customSlips).toEqual({ '2026-11-17': true })
  })

  it('round-trips through a backup', () => {
    const state = habit()
    const restored = parseBackup(JSON.stringify(createBackup(state)))
    expect(restored.settings.custom).toMatchObject({ goal: 'quit', since: '2026-11-14' })
    expect(restored.customSlips).toEqual({ '2026-11-17': true })
  })
})

describe('setup and saving', () => {
  it('toggles a day on and off', () => {
    const state = withCustom({}, [])
    const on = toggleCustomDay(state, '2026-11-20')
    expect(on.customLog).toEqual({ '2026-11-20': true })
    expect(toggleCustomDay(on, '2026-11-20').customLog).toEqual({})
  })

  it('checks the setup and log from a save', () => {
    expect(readCustom({ custom: { name: '  ' } })).toBeNull()
    expect(
      readCustom({
        custom: { name: ' Reading ', icon: 'nope', color: 'blue', goal: 'x', perWeek: 9 },
      }),
    ).toEqual({
      name: 'Reading',
      icon: 'star',
      color: 'violet',
      goal: 'daily',
      perWeek: 3,
      since: null,
    })
    expect(readCustomLog({ '2026-11-01': true, bad: true, '2026-11-02': 'yes' })).toEqual({
      '2026-11-01': true,
    })
  })

  it('only shows the custom tab while there is one', () => {
    expect(readEnabledTrackers({ enabledTrackers: ['work', 'custom'] })).toEqual(['work'])
    const custom = { name: 'Reading' }
    expect(readEnabledTrackers({ custom, enabledTrackers: ['work', 'custom'] })).toEqual([
      'work',
      'custom',
    ])
    expect(readEnabledTrackers({ custom })).toEqual(['morning', 'workout', 'work', 'custom'])
  })

  it('round-trips through a backup', () => {
    const state = withCustom({ goal: 'weekly', perWeek: 4, color: 'teal' }, [16, 17])
    state.settings.enabledTrackers = ['morning', 'custom']
    const restored = parseBackup(JSON.stringify(createBackup(state)))
    expect(restored.settings.custom).toEqual(state.settings.custom)
    expect(restored.settings.enabledTrackers).toEqual(['morning', 'custom'])
    expect(restored.customLog).toEqual(state.customLog)
  })
})
