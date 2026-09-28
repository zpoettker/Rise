import { describe, expect, it } from 'vitest'
import { createInitialState, recordLoginIfNeeded } from './logins'

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
})
