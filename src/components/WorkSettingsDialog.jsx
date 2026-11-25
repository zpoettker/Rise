import { useState } from 'react'
import { useWorkGoal } from '../hooks/useWorkGoal'
import { updateSettings } from '../lib/logins'
import { setWorkGoal } from '../lib/work'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { WorkGoalFields } from './WorkGoalDialog'

// The gear on the Work tab: the daily goal (a change starts next Monday or
// today, earlier days keep their goal) and whether weekends are tracked.
// `onSave` gets a state updater.
export function WorkSettingsDialog({ settings, today, onSave, onClose }) {
  const goal = useWorkGoal(settings, today)
  const [weekends, setWeekends] = useState(settings.workWeekends)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!goal.valid) return
    onSave((s) => {
      const next = updateSettings(s, { workWeekends: weekends })
      return goal.changed ? setWorkGoal(next, goal.minutes, goal.from) : next
    })
  }

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label="Settings">Your work goal</DialogTitle>

        <WorkGoalFields settings={settings} goal={goal} label="Daily goal (hours)" />

        <label className="flex cursor-pointer items-start gap-3 border-t border-line pt-5">
          <input
            type="checkbox"
            checked={weekends}
            onChange={(e) => setWeekends(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent-500"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Track weekends</span>
            <span className="block text-xs text-ink-soft">
              {weekends
                ? 'Saturdays and Sundays have a goal like any other day.'
                : "Weekends are skipped: they have no goal and are never missed."}
            </span>
          </span>
        </label>

        <p className="text-xs text-ink-soft">
          Your name, day start, tabs and backups are in the All tab's settings.
        </p>

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
