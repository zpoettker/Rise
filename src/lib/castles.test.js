import { describe, expect, it } from 'vitest'
import { createInitialState, updateSettings } from './logins'
import { CASTLES, castleAt, castleBricks, getCastleProgress } from './castles'

const pad = (n) => String(n).padStart(2, '0')

// `days` weekdays on goal (6h each), counting back from Friday Nov 13, 2026
function stateWithHits(days, settings = {}) {
  const state = updateSettings(createInitialState(), settings)
  const date = new Date(2026, 10, 13)
  let added = 0
  while (added < days) {
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      state.workSessions.push({ id: key, start: `${key}T09:00`, end: `${key}T15:00` })
      added += 1
    }
    date.setDate(date.getDate() - 1)
  }
  return state
}
const monday = new Date(2026, 10, 16, 12) // the Monday after, nothing logged yet

describe('castle designs', () => {
  it('have rows of equal width and grow in size', () => {
    for (const { name, rows } of CASTLES) {
      expect(new Set(rows.map((r) => r.length)).size, name).toBe(1)
    }
  })

  it('build from the bottom row up, left to right, in a running bond', () => {
    const bricks = castleBricks(CASTLES[0])
    // bottom row (row 5, shifted): '##.##' → half, brick, half | half, brick, half... minus the door
    expect(bricks.filter((b) => b.row === 5)).toEqual([
      { row: 5, col: 0, span: 1 },
      { row: 5, col: 1, span: 2 },
      { row: 5, col: 3, span: 1 },
      { row: 5, col: 6, span: 1 },
      { row: 5, col: 7, span: 2 },
      { row: 5, col: 9, span: 1 },
    ])
    // the row above isn't shifted: whole bricks
    expect(bricks.filter((b) => b.row === 4).map((b) => b.span)).toEqual([2, 2, 2, 2, 2])
    // the top row's battlements stay whole and come last
    expect(bricks.filter((b) => b.row === 0)).toEqual([
      { row: 0, col: 0, span: 2 },
      { row: 0, col: 4, span: 2 },
      { row: 0, col: 8, span: 2 },
    ])
    expect(bricks.at(-1)).toEqual({ row: 0, col: 8, span: 2 })
  })

  it('need more bricks for each castle, with a small first one', () => {
    const sizes = CASTLES.map((c) => castleBricks(c).length)
    expect(sizes[0]).toBeLessThan(35)
    sizes.slice(1).forEach((size, i) => expect(size).toBeGreaterThan(sizes[i] * 1.3))
  })

  it('repeat with a number after the last design', () => {
    expect(castleAt(0).name).toBe('The Watchtower')
    expect(castleAt(CASTLES.length).name).toBe('The Watchtower II')
  })
})

describe('getCastleProgress', () => {
  const size0 = castleBricks(CASTLES[0]).length

  it('lays one brick per day on goal', () => {
    const p = getCastleProgress(stateWithHits(10), monday, monday.getTime())
    expect(p.completed).toEqual([])
    expect(p.current).toMatchObject({ name: 'The Watchtower', laid: 10 })
    expect(p.current.dates[0] < p.current.dates[9]).toBe(true)
    expect(p.todayMet).toBe(false)
  })

  it('moves on to the next castle once one is complete', () => {
    const p = getCastleProgress(stateWithHits(size0 + 3), monday, monday.getTime())
    expect(p.completed.map((c) => c.name)).toEqual(['The Watchtower'])
    expect(p.completed[0]).toMatchObject({ laid: size0 })
    expect(p.completed[0].dates).toHaveLength(size0)
    expect(p.completed[0].finishedOn < p.current.dates[0]).toBe(true)
    expect(p.current).toMatchObject({ name: 'The Gatehouse', laid: 3 })
  })

  it('lists the castles still to come in this round as locked', () => {
    const p = getCastleProgress(stateWithHits(size0 + 3), monday, monday.getTime())
    expect(p.locked.map((c) => c.name)).toEqual(CASTLES.slice(2).map((c) => c.name))
  })

  it("keeps a castle finished today on show, complete", () => {
    const state = stateWithHits(size0 - 1)
    state.workSessions.push({ id: 'today', start: '2026-11-16T08:00', end: '2026-11-16T14:30' })
    const p = getCastleProgress(state, monday, monday.getTime())
    expect(p.justFinished).toBe(true)
    expect(p.completed).toEqual([])
    expect(p.current).toMatchObject({ name: 'The Watchtower', laid: size0 })
    expect(p.current.dates.at(-1)).toBe('2026-11-16')
  })

  it('counts a running timer that reaches the goal today', () => {
    const state = stateWithHits(4)
    state.timer = { mode: 'stopwatch', startedAt: new Date(2026, 10, 16, 6).getTime(), elapsedBefore: 0 }
    const p = getCastleProgress(state, monday, monday.getTime()) // 6h by noon
    expect(p.todayMet).toBe(true)
    expect(p.current.laid).toBe(5)
  })
})
