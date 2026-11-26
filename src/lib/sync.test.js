import { describe, expect, it } from 'vitest'
import { createInitialState, setLoginTime } from './logins'
import { diffRows, fromRows, hasData, isEmptyAccount, toRows } from './sync'

function sample() {
  const state = setLoginTime(createInitialState(), '2026-11-24', '08:10')
  state.settings.name = 'Zach'
  state.workouts = [{ id: 'w1', start: '2026-11-24T18:00', end: '2026-11-24T19:00' }]
  state.workSessions = [{ id: 's1', start: '2026-11-24T09:00', end: '2026-11-24T10:30' }]
  state.weights = [{ id: 'k1', at: '2026-11-24T07:00', kg: 82.6896 }]
  state.customLog = { '2026-11-23': true }
  state.customSlips = { '2026-11-22': true }
  state.timer = { mode: 'stopwatch', startedAt: 123, elapsedBefore: 0 }
  return state
}

describe('rows', () => {
  it('turns state into rows and back', () => {
    const state = sample()
    const rows = toRows(state)
    expect(rows.wake_logs).toEqual([{ date: '2026-11-24', time: '08:10', edited: true }])
    expect(rows.custom_days).toEqual([
      { date: '2026-11-23', kind: 'done' },
      { date: '2026-11-22', kind: 'slip' },
    ])
    const back = fromRows(rows)
    expect(back.entries).toEqual(state.entries)
    expect(back.workouts).toEqual(state.workouts)
    expect(back.workSessions).toEqual(state.workSessions)
    expect(back.weights).toEqual(state.weights)
    expect(back.customLog).toEqual(state.customLog)
    expect(back.customSlips).toEqual(state.customSlips)
    expect(back.settings.name).toBe('Zach')
    expect(back.timer).toEqual(state.timer)
  })

  it('reads timestamps and numbers the way Postgres sends them', () => {
    const rows = toRows(createInitialState())
    rows.workouts = [
      { id: 'w1', started_at: '2026-11-24T18:00:00', ended_at: '2026-11-24T19:00:00' },
    ]
    rows.weights = [{ id: 'k1', at: '2026-11-24T07:00:00', kg: '82.5' }]
    const back = fromRows(rows)
    expect(back.workouts[0]).toEqual({
      id: 'w1',
      start: '2026-11-24T18:00',
      end: '2026-11-24T19:00',
    })
    expect(back.weights[0].kg).toBe(82.5)
  })

  it('knows a brand-new account and a device with data', () => {
    const empty = {
      profile: { settings: {} },
      wake_logs: [],
      workouts: [],
      work_sessions: [],
      weights: [],
      custom_days: [],
    }
    expect(isEmptyAccount(empty)).toBe(true)
    expect(isEmptyAccount(toRows(sample()))).toBe(false)
    expect(hasData(createInitialState())).toBe(false)
    expect(hasData(sample())).toBe(true)
  })
})

describe('diffRows', () => {
  it('sends everything the first time', () => {
    const diff = diffRows(null, toRows(sample()))
    expect(diff.any).toBe(true)
    expect(diff.profile).toBe(true)
    expect(diff.tables.workouts.upsert).toHaveLength(1)
  })

  it('sends only what changed', () => {
    const before = sample()
    const after = {
      ...before,
      workouts: [
        ...before.workouts,
        { id: 'w2', start: '2026-11-25T07:00', end: '2026-11-25T07:45' },
      ],
    }
    const diff = diffRows(toRows(before), toRows(after))
    expect(diff.tables.workouts.upsert.map((r) => r.id)).toEqual(['w2'])
    expect(diff.tables.wake_logs.upsert).toEqual([])
    expect(diff.profile).toBe(false)
  })

  it('removes deleted rows and resends edited ones', () => {
    const before = sample()
    const after = {
      ...setLoginTime(before, '2026-11-24', '07:55'),
      workSessions: [],
      customSlips: {},
    }
    const diff = diffRows(toRows(before), toRows(after))
    expect(diff.tables.wake_logs.upsert).toEqual([
      { date: '2026-11-24', time: '07:55', edited: true },
    ])
    expect(diff.tables.work_sessions.remove.map((r) => r.id)).toEqual(['s1'])
    expect(diff.tables.custom_days.remove).toEqual([{ date: '2026-11-22', kind: 'slip' }])
  })

  it('notices settings and timer changes', () => {
    const before = sample()
    const after = { ...before, timer: null }
    expect(diffRows(toRows(before), toRows(after))).toMatchObject({ profile: true, any: true })
    expect(diffRows(toRows(before), toRows(before)).any).toBe(false)
  })
})
