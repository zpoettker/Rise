import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { parseWeight, shown, useWeightGoal } from '../hooks/useWeightGoal'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { SegmentedControl } from './ui/SegmentedControl'
import { TrashIcon } from './ui/TrashIcon'

const INPUT =
  'mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 font-display text-2xl tabular-nums focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-200/60'
const UNITS = [
  { value: 'lb', label: 'lb' },
  { value: 'kg', label: 'kg' },
]

// Add a weigh-in (`weight` null) or edit / delete one
export function WeighInDialog({ weight, unit, lastKg, onSave, onDelete, onClose }) {
  const now = new Date()
  const [date, setDate] = useState(weight ? weight.at.slice(0, 10) : format(now, 'yyyy-MM-dd'))
  const [time, setTime] = useState(weight ? weight.at.slice(11) : format(now, 'HH:mm'))
  const start = weight?.kg ?? lastKg
  const [value, setValue] = useState(start != null ? shown(start, unit) : '')
  const kg = parseWeight(value, unit)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (kg == null || !date || !time) return
    onSave({ id: weight?.id ?? `wt${Date.now()}`, at: `${date}T${time}`, kg })
  }

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label={weight ? 'Edit weigh-in' : 'Add weigh-in'}>
          {date ? format(parseISO(date), 'EEEE, MMMM d') : 'Weigh-in'}
        </DialogTitle>

        <label className="block">
          <span className="text-sm font-semibold text-ink-soft">Weight ({unit})</span>
          <input
            type="number"
            required
            autoFocus
            step="0.1"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={INPUT}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-ink-soft">Date</span>
            <input
              type="date"
              required
              max={format(now, 'yyyy-MM-dd')}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${INPUT} text-lg`}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-ink-soft">Time</span>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`${INPUT} text-lg`}
            />
          </label>
        </div>

        {value !== '' && kg == null && (
          <p className="text-sm font-bold text-ink">That doesn't look like a weight in {unit}.</p>
        )}

        <div className="flex items-center gap-2">
          {weight && (
            <button
              type="button"
              aria-label="Delete weigh-in"
              title="Delete weigh-in"
              onClick={onDelete}
              className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-accent-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <TrashIcon className="size-5" />
            </button>
          )}
          <Button variant="ghost" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={kg == null}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

// The unit weights are shown in, and an optional goal weight
// The goal weight and unit fields, shared by the "Set goal" popup and the
// Workout settings. `useWeightGoal` holds the draft; `result` is what to save.
export function WeightGoalFields({ goal }) {
  const { unit, value, setValue, changeUnit, valid } = goal
  return (
    <>
      <div>
        <span className="text-sm font-semibold text-ink-soft">Show weights in</span>
        <div className="mt-1.5">
          <SegmentedControl label="Weight unit" options={UNITS} value={unit} onChange={changeUnit} />
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-ink-soft">Goal weight ({unit})</span>
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          placeholder="No goal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${INPUT} placeholder:text-ink-soft/50`}
        />
        <span className="mt-1.5 block text-xs text-ink-soft">
          Leave empty for no goal. It's drawn as a dashed line on the chart.
        </span>
      </label>

      {!valid && <p className="text-sm font-bold text-ink">That doesn't look like a weight in {unit}.</p>}
    </>
  )
}

export function WeightGoalDialog({ settings, onSave, onClose }) {
  const goal = useWeightGoal(settings)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (goal.valid) onSave(goal.result)
  }

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label="Weight">Goal &amp; units</DialogTitle>
        <WeightGoalFields goal={goal} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!goal.valid}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
