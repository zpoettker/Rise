import { useState } from 'react'
import { useWeightGoal } from '../hooks/useWeightGoal'
import { MAX_WEEKLY_GOAL } from '../lib/logins'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { SegmentedControl } from './ui/SegmentedControl'
import { WeightGoalFields } from './WeightDialogs'

const DAYS = Array.from({ length: MAX_WEEKLY_GOAL }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}))

// The gear on the Workout tab: the weekly goal, plus the weight chart's unit
// and goal weight (also reachable from the chart's "Set goal").
export function WorkoutSettingsDialog({ settings, onSave, onClose }) {
  const [weeklyGoal, setWeeklyGoal] = useState(settings.workoutWeeklyGoal)
  const weight = useWeightGoal(settings)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (weight.valid) onSave({ workoutWeeklyGoal: weeklyGoal, ...weight.result })
  }

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label="Settings">Your workout goal</DialogTitle>

        <div>
          <span className="text-sm font-semibold text-ink-soft">Workout days per week</span>
          <div className="mt-1.5">
            <SegmentedControl
              label="Workout days per week"
              options={DAYS}
              value={weeklyGoal}
              onChange={setWeeklyGoal}
            />
          </div>
          <span className="mt-1.5 block text-xs text-ink-soft">
            A Mon–Sun week is on goal once you work out on {weeklyGoal}{' '}
            {weeklyGoal === 1 ? 'day' : 'different days'}. Changes apply to past weeks too.
          </span>
        </div>

        <div className="space-y-5 border-t border-line pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">Weight</p>
          <WeightGoalFields goal={weight} />
        </div>

        <p className="text-xs text-ink-soft">
          Your name, day start, tabs and backups are in the All tab's settings.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!weight.valid}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
