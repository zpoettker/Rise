import { describe, expect, it } from 'vitest'
import {
  createBackup,
  createInitialState,
  dayOf,
  DEFAULT_SETTINGS,
  deleteLogin,
  parseBackup,
  recordLoginIfNeeded,
  setLoginTime,
  toDateKey,
  updateSettings,
} from './logins'

// 2026-09-28 is a Monday
const monday = (h, m) => new Date(2026, 8, 28, h, m)

describe('recordLoginIfNeeded', () => {
  it('records the first login of a weekday', () => {
    const state = recordLoginIfNeeded(createInitialState(), monday(6, 42))
    expect(state.entries['2026-09-28']).toEqual({ time: '06:42' })
  })

  it('ignores later visits on the same day', () => {
    const first = recordLoginIfNeeded(createInitialState(), monday(6, 42))
    const second = recordLoginIfNeeded(first, monday(9, 15))
    expect(second).toBe(first)
  })

  it('does not record on weekends', () => {
    const initial = createInitialState()
    const saturday = new Date(2026, 9, 3, 8, 0)
    expect(recordLoginIfNeeded(initial, saturday)).toBe(initial)
  })

  it('records a new day even if the previous day exists', () => {
    const mon = recordLoginIfNeeded(createInitialState(), monday(6, 42))
    const tue = recordLoginIfNeeded(mon, new Date(2026, 8, 29, 7, 3))
    expect(Object.keys(tue.entries)).toEqual(['2026-09-28', '2026-09-29'])
  })

  it('ignores visits before the day start', () => {
    const initial = createInitialState()
    expect(recordLoginIfNeeded(initial, monday(0, 1))).toBe(initial)
    expect(recordLoginIfNeeded(initial, monday(3, 59))).toBe(initial)
    const state = recordLoginIfNeeded(initial, monday(4, 0))
    expect(state.entries['2026-09-28']).toEqual({ time: '04:00' })
  })

  it('respects a custom day start', () => {
    const initial = updateSettings(createInitialState(), { dayStart: '03:00' })
    const state = recordLoginIfNeeded(initial, monday(3, 30))
    expect(state.entries['2026-09-28']).toEqual({ time: '03:30' })
  })
})

describe('setLoginTime', () => {
  it('overwrites an existing login and marks it edited', () => {
    const state = recordLoginIfNeeded(createInitialState(), monday(9, 10))
    const edited = setLoginTime(state, '2026-09-28', '08:20')
    expect(edited.entries['2026-09-28']).toEqual({ time: '08:20', edited: true })
    expect(state.entries['2026-09-28'].time).toBe('09:10')
  })

  it('adds a login for a day with no data', () => {
    const edited = setLoginTime(createInitialState(), '2026-09-22', '08:05')
    expect(edited.entries['2026-09-22']).toEqual({ time: '08:05', edited: true })
  })
})

describe('deleteLogin', () => {
  it('removes only that day', () => {
    const mon = recordLoginIfNeeded(createInitialState(), monday(8, 0))
    const both = setLoginTime(mon, '2026-09-25', '08:10')
    const deleted = deleteLogin(both, '2026-09-28')
    expect(deleted.entries).toEqual({ '2026-09-25': { time: '08:10', edited: true } })
    expect(both.entries['2026-09-28']).toBeDefined()
  })
})

describe('updateSettings', () => {
  it('replaces the given settings and keeps entries', () => {
    const state = recordLoginIfNeeded(createInitialState(), monday(8, 0))
    const updated = updateSettings(state, { targetTime: '07:45' })
    expect(updated.settings).toEqual({ ...DEFAULT_SETTINGS, targetTime: '07:45' })
    expect(updated.entries).toBe(state.entries)
  })
})

describe('dayOf', () => {
  const settings = { dayStart: '04:00' }

  it('keeps the calendar date after the day start', () => {
    expect(toDateKey(dayOf(monday(4, 0), settings))).toBe('2026-09-28')
    expect(toDateKey(dayOf(monday(23, 59), settings))).toBe('2026-09-28')
  })

  it('rolls back to the previous day before the day start', () => {
    expect(toDateKey(dayOf(monday(0, 1), settings))).toBe('2026-09-27')
    expect(toDateKey(dayOf(monday(3, 59), settings))).toBe('2026-09-27')
  })
})

describe('backups', () => {
  const state = setLoginTime(
    recordLoginIfNeeded(createInitialState(), monday(8, 12)),
    '2026-09-25',
    '08:40',
  )

  it('round-trips through export and import', () => {
    const text = JSON.stringify(createBackup(state, monday(9, 0)))
    expect(parseBackup(text)).toEqual(state)
  })

  it('stamps the export time', () => {
    expect(createBackup(state, monday(9, 0)).exportedAt).toBe(monday(9, 0).toISOString())
  })

  it('fills in missing or invalid settings with defaults', () => {
    const text = JSON.stringify({ entries: {}, settings: { targetTime: '07:15', graceMinutes: -5 } })
    expect(parseBackup(text).settings).toEqual({ ...DEFAULT_SETTINGS, targetTime: '07:15' })
  })

  it('keeps a trimmed name and ignores one that is not text', () => {
    const named = parseBackup(JSON.stringify({ entries: {}, settings: { name: '  Sam  ' } }))
    expect(named.settings.name).toBe('Sam')
    const bad = parseBackup(JSON.stringify({ entries: {}, settings: { name: 42 } }))
    expect(bad.settings.name).toBe('')
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/valid JSON/)
    expect(() => parseBackup('{"foo":1}')).toThrow(/Rise backup/)
    expect(() => parseBackup('null')).toThrow(/Rise backup/)
  })

  it('rejects bad days and times', () => {
    const bad = (entries) => () => parseBackup(JSON.stringify({ entries }))
    expect(bad({ '2026-02-30': { time: '08:00' } })).toThrow(/2026-02-30/)
    expect(bad({ yesterday: { time: '08:00' } })).toThrow(/yesterday/)
    expect(bad({ '2026-09-28': { time: '25:00' } })).toThrow(/2026-09-28/)
    expect(bad({ '2026-09-28': null })).toThrow(/2026-09-28/)
  })
})
