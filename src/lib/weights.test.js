import { describe, expect, it } from 'vitest'
import { createBackup, createInitialState, parseBackup } from './logins'
import {
  deleteWeight,
  formatWeight,
  fromUnit,
  getWeightSeries,
  getWeightSummary,
  saveWeight,
  toUnit,
} from './weights'

const pad = (n) => String(n).padStart(2, '0')
// weigh-ins given as { 'month-day': kg } at 7 AM, Nov 2026 unless the key has a month
function stateWith(weights) {
  let state = createInitialState()
  for (const [key, kg] of Object.entries(weights)) {
    const [m, d] = key.includes('-') ? key.split('-').map(Number) : [11, Number(key)]
    state = saveWeight(state, { id: key, at: `2026-${pad(m)}-${pad(d)}T07:00`, kg })
  }
  return state
}

describe('units', () => {
  it('converts between kg and lb without drifting', () => {
    expect(toUnit(100, 'lb')).toBeCloseTo(220.462)
    expect(fromUnit(toUnit(81.3, 'lb'), 'lb')).toBeCloseTo(81.3, 10)
    expect(formatWeight(81.3, 'lb')).toBe('179.2 lb')
    expect(formatWeight(81.3, 'kg')).toBe('81.3 kg')
  })
})

describe('saving weigh-ins', () => {
  it('keeps them in time order and replaces by id', () => {
    let state = stateWith({ 10: 80, 2: 82 })
    expect(state.weights.map((w) => w.id)).toEqual(['2', '10'])
    state = saveWeight(state, { id: '2', at: '2026-11-02T07:00', kg: 81 })
    expect(state.weights).toHaveLength(2)
    expect(state.weights[0].kg).toBe(81)
    expect(deleteWeight(state, '2').weights.map((w) => w.id)).toEqual(['10'])
  })
})

describe('getWeightSeries', () => {
  it('lists weigh-ins oldest first with their dates', () => {
    const series = getWeightSeries(stateWith({ 9: 86, 1: 80 }))
    expect(series.map((p) => [p.id, p.kg])).toEqual([['1', 80], ['9', 86]])
    expect(series[0].date).toEqual(new Date(2026, 10, 1, 7, 0))
  })
})

describe('getWeightSummary', () => {
  it('shows the change from the first weigh-in in the range to the latest', () => {
    const state = stateWith({ '10-1': 90, 1: 84, 10: 83, 17: 82 })
    const today = new Date(2026, 10, 18)
    const month = getWeightSummary(state, '30d', today)
    expect(month.points.map((p) => p.id)).toEqual(['1', '10', '17'])
    expect(month.latest.kg).toBe(82)
    expect(month.change).toBeCloseTo(-2)
    expect(month.days).toBe(16)
    expect(getWeightSummary(state, 'all', today).points).toHaveLength(4)
  })

  it('handles no weigh-ins and a single one', () => {
    expect(getWeightSummary(createInitialState(), '30d')).toMatchObject({ points: [], latest: null })
    const one = getWeightSummary(stateWith({ 17: 82 }), '30d', new Date(2026, 10, 18))
    expect(one).toMatchObject({ change: null })
  })
})

describe('backups', () => {
  it('round-trip weigh-ins and weight settings', () => {
    const state = stateWith({ 17: 81.6 })
    state.settings = { ...state.settings, weightUnit: 'kg', weightGoalKg: 78 }
    const restored = parseBackup(JSON.stringify(createBackup(state)))
    expect(restored.weights).toEqual(state.weights)
    expect(restored.settings).toMatchObject({ weightUnit: 'kg', weightGoalKg: 78 })
  })

  it('reject a nonsense weight', () => {
    const backup = { ...createInitialState(), weights: [{ id: 'x', at: '2026-11-17T07:00', kg: 3 }] }
    expect(() => parseBackup(JSON.stringify(backup))).toThrow('weigh-in')
  })
})
