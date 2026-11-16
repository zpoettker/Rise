import { describe, expect, it } from 'vitest'
import { createBackup, createInitialState } from './logins'
import {
  formatClock,
  MINUTE,
  pauseTimer,
  resumeTimer,
  saveStretch,
  settleTimer,
  startTimer,
  stopTimer,
  timerElapsed,
  timerRemaining,
} from './timer'

// Nov 2026; day start is 4 AM by default
const at = (d, h, m = 0, s = 0) => new Date(2026, 10, d, h, m, s).getTime()
const spans = (state) => state.workSessions.map(({ start, end }) => [start, end])

describe('stopwatch', () => {
  it('saves each stretch as a session on pause and stop, counting across them', () => {
    let state = startTimer(createInitialState(), 'stopwatch', null, at(16, 9))
    state = pauseTimer(state, at(16, 10, 30))
    expect(timerElapsed(state.timer, at(16, 11))).toBe(90 * MINUTE) // paused: not counting
    state = resumeTimer(state, at(16, 11))
    expect(timerElapsed(state.timer, at(16, 11, 15))).toBe(105 * MINUTE)
    state = stopTimer(state, at(16, 12))
    expect(state.timer).toBeNull()
    expect(spans(state)).toEqual([
      ['2026-11-16T09:00', '2026-11-16T10:30'],
      ['2026-11-16T11:00', '2026-11-16T12:00'],
    ])
  })

  it('rounds to whole minutes and drops a stretch under half a minute', () => {
    const state = createInitialState()
    expect(spans(saveStretch(state, at(16, 9, 0, 50), at(16, 9, 1, 10)))).toEqual([])
    expect(spans(saveStretch(state, at(16, 9, 0, 50), at(16, 9, 26, 30)))).toEqual([
      ['2026-11-16T09:00', '2026-11-16T09:26'],
    ])
  })

  it('splits a stretch at the day start', () => {
    const state = saveStretch(createInitialState(), at(16, 22), at(17, 6))
    expect(spans(state)).toEqual([
      ['2026-11-16T22:00', '2026-11-17T04:00'],
      ['2026-11-17T04:00', '2026-11-17T06:00'],
    ])
  })
})

describe('timer mode', () => {
  it('counts down and saves exactly the set time once it runs out', () => {
    let state = startTimer(createInitialState(), 'timer', 50, at(16, 9))
    expect(timerRemaining(state.timer, at(16, 9, 20))).toBe(30 * MINUTE)
    expect(settleTimer(state, at(16, 9, 49))).toBe(state) // not yet
    // the tab was closed and reopened well after it ended
    state = settleTimer(state, at(16, 13))
    expect(state.timer).toMatchObject({ done: true, startedAt: null })
    expect(timerRemaining(state.timer, at(16, 13))).toBe(0)
    expect(spans(state)).toEqual([['2026-11-16T09:00', '2026-11-16T09:50']])
  })

  it('keeps the remaining time through a pause', () => {
    let state = startTimer(createInitialState(), 'timer', 30, at(16, 9))
    state = pauseTimer(state, at(16, 9, 10))
    state = resumeTimer(state, at(16, 10))
    state = settleTimer(state, at(16, 11))
    expect(spans(state)).toEqual([
      ['2026-11-16T09:00', '2026-11-16T09:10'],
      ['2026-11-16T10:00', '2026-11-16T10:20'],
    ])
  })
})

describe('backups', () => {
  it('leave out a running timer', () => {
    const state = startTimer(createInitialState(), 'stopwatch', null, at(16, 9))
    expect(createBackup(state)).not.toHaveProperty('timer')
  })
})

describe('formatClock', () => {
  it('shows hours only when needed', () => {
    expect(formatClock(4 * MINUTE + 9000)).toBe('4:09')
    expect(formatClock(64 * MINUTE + 9000)).toBe('1:04:09')
  })
})
