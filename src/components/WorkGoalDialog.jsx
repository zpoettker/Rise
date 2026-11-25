import { format, parseISO } from 'date-fns'
import { useWorkGoal } from '../hooks/useWorkGoal'
import { MAX_WORK_GOAL_MINUTES, MIN_WORK_GOAL_MINUTES } from '../lib/logins'
import { formatDuration } from '../lib/stats'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { SegmentedControl } from './ui/SegmentedControl'

const INPUT =
  'mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 font-display text-3xl tabular-nums focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-200/60'
const SHOWN_CHANGES = 5

// The daily goal fields (new goal, when it starts, recent changes), shared by
// the "Change goal" popup and the Work settings; the draft is `useWorkGoal`.
export function WorkGoalFields({ settings, goal, autoFocus = false, label = 'New goal (hours)' }) {
  const { todayKey, mondayKey, hours, setHours, start, setStart, minutes, valid } = goal
  const startOptions = [
    { value: 'monday', label: `Next Monday (${format(parseISO(mondayKey), 'MMM d')})` },
    { value: 'today', label: 'Today' },
  ]
  // newest first; the very first entry has no real start date
  const changes = [...settings.workGoals].reverse().slice(0, SHOWN_CHANGES)
  const since = (g) => (g === settings.workGoals[0] ? 'From the start' : format(parseISO(g.from), 'MMM d, yyyy'))

  return (
    <>
      <label className="block">
        <span className="text-sm font-semibold text-ink-soft">{label}</span>
        <input
          type="number"
          required
          autoFocus={autoFocus}
          min={MIN_WORK_GOAL_MINUTES / 60}
          max={MAX_WORK_GOAL_MINUTES / 60}
          step="0.25"
          inputMode="decimal"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className={INPUT}
        />
        <span className="mt-1.5 block text-xs text-ink-soft">
          {valid ? `${formatDuration(minutes)} of deep work a day` : 'Between 15 minutes and 16 hours'}
        </span>
      </label>

      {/* when it starts only matters once the goal is changed */}
      {goal.changed && (
        <div>
          <span className="text-sm font-semibold text-ink-soft">Starts</span>
          <div className="mt-1.5">
            <SegmentedControl label="Goal starts" options={startOptions} value={start} onChange={setStart} />
          </div>
          <span className="mt-1.5 block text-xs text-ink-soft">
            {start === 'monday'
              ? 'This week keeps its goal; the new one starts with the next week.'
              : 'Applies from today on, including today.'}
          </span>
        </div>
      )}

      <div className="border-t border-line pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">Goal history</p>
        <ul className="mt-2 space-y-1 text-sm">
          {changes.map((g) => (
            <li key={g.from} className="flex justify-between gap-4">
              <span className="text-ink-soft">
                {since(g)}
                {g.from > todayKey && ' · upcoming'}
              </span>
              <span className="font-bold tabular-nums">{formatDuration(g.minutes)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

// Change the daily work goal from next Monday (default) or today. Earlier
// days keep the goal they had, so past met days stay met.
export function WorkGoalDialog({ settings, today, onSave, onClose }) {
  const goal = useWorkGoal(settings, today)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (goal.changed) onSave(goal.minutes, goal.from)
    else if (goal.valid) onClose()
  }

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label="Work">Daily goal</DialogTitle>
        <p className="text-sm text-ink-soft">
          Now <span className="font-bold text-ink">{formatDuration(goal.current)}</span> a day. Raise
          it a little at a time; days before the change keep the goal they had.
        </p>
        <WorkGoalFields settings={settings} goal={goal} autoFocus />
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
