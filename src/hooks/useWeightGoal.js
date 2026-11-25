import { useState } from 'react'
import { fromUnit, MAX_KG, MIN_KG, toUnit } from '../lib/weights'

// The weight typed in `unit`, as kg, or null if it isn't a sensible weight
export function parseWeight(text, unit) {
  const kg = fromUnit(Number(text), unit)
  return text !== '' && kg >= MIN_KG && kg <= MAX_KG ? kg : null
}

export const shown = (kg, unit) => String(Math.round(toUnit(kg, unit) * 10) / 10)

// Draft of the goal weight and unit, shared by the "Set goal" popup and the
// Workout settings (fields in `WeightGoalFields`). `result` is what to save.
export function useWeightGoal(settings) {
  const [unit, setUnit] = useState(settings.weightUnit)
  const [value, setValue] = useState(
    settings.weightGoalKg != null ? shown(settings.weightGoalKg, settings.weightUnit) : '',
  )
  const goalKg = parseWeight(value, unit)
  const valid = value === '' || goalKg != null

  // switching units converts what's typed, so the goal stays the same weight
  const changeUnit = (next) => {
    const kg = parseWeight(value, unit)
    if (kg != null) setValue(shown(kg, next))
    setUnit(next)
  }

  return {
    unit,
    value,
    setValue,
    changeUnit,
    valid,
    result: { weightUnit: unit, weightGoalKg: value === '' ? null : goalKg },
  }
}

