import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'
import { MAX_KG, MIN_KG } from './logins'
import { rangeStart } from './stats'

export { MAX_KG, MIN_KG }

// Weigh-ins: state.weights = [{ id, at: 'yyyy-MM-ddTHH:mm', kg }], in any
// order. Weights are stored in kg (what Apple Health and the backend use) at
// full precision, and shown in the unit from settings.weightUnit ('lb' | 'kg').
// settings.weightGoalKg is an optional goal weight (or null).

export const LB_PER_KG = 2.20462262

export const toUnit = (kg, unit) => (unit === 'lb' ? kg * LB_PER_KG : kg)
export const fromUnit = (value, unit) => (unit === 'lb' ? value / LB_PER_KG : value)

// "182.4 lb"
export const formatWeight = (kg, unit) => `${toUnit(kg, unit).toFixed(1)} ${unit}`

const byTime = (a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)

// Adds a weigh-in, or replaces the one with the same id
export function saveWeight(state, weight) {
  const rest = state.weights.filter((w) => w.id !== weight.id)
  return { ...state, weights: [...rest, weight].sort(byTime) }
}

export const deleteWeight = (state, id) => ({
  ...state,
  weights: state.weights.filter((w) => w.id !== id),
})

// Every weigh-in, oldest first, with its time as a Date
export function getWeightSeries(state) {
  return [...state.weights].sort(byTime).map((w) => ({ ...w, date: parseISO(w.at) }))
}

// What the weight card shows for the selected range: the weigh-ins in it,
// the latest weight, and the change from the range's first weigh-in.
export function getWeightSummary(state, range = '30d', today = new Date()) {
  const series = getWeightSeries(state)
  if (!series.length) return { points: [], latest: null, change: null, days: 0 }

  const from = rangeStart(range, startOfDay(series[0].date), today)
  const points = series.filter((p) => p.date >= startOfDay(from))
  const latest = series.at(-1)
  const first = points[0]
  return {
    points,
    latest,
    change: points.length > 1 ? latest.kg - first.kg : null,
    days: first ? differenceInCalendarDays(latest.date, first.date) : 0,
  }
}
