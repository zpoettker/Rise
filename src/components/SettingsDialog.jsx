import { useState } from 'react'
import { DEFAULT_SETTINGS } from '../lib/logins'
import { formatMinutes, formatTime12, toMinutes } from '../lib/stats'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'

const MAX_GRACE = 60
const INPUT =
  'mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 font-display text-3xl tabular-nums focus:border-sun-400 focus:outline-none focus:ring-4 focus:ring-sun-200/60'

export function SettingsDialog({ settings, onSave, onClose }) {
  const [targetTime, setTargetTime] = useState(settings.targetTime)
  const [grace, setGrace] = useState(String(settings.graceMinutes))

  const graceMinutes = Number(grace)
  const valid = targetTime && grace !== '' && graceMinutes >= 0 && graceMinutes <= MAX_GRACE
  const deadline = valid ? formatMinutes(toMinutes(targetTime) + graceMinutes) : null
  const isDefault =
    targetTime === DEFAULT_SETTINGS.targetTime && graceMinutes === DEFAULT_SETTINGS.graceMinutes

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!valid) return
    onSave({ targetTime, graceMinutes: Math.round(graceMinutes) })
  }

  const resetToDefaults = () => {
    setTargetTime(DEFAULT_SETTINGS.targetTime)
    setGrace(String(DEFAULT_SETTINGS.graceMinutes))
  }

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label="Settings">Your morning goal</DialogTitle>

        <label className="block">
          <span className="text-sm font-semibold text-ink-soft">Target time</span>
          <input
            type="time"
            required
            autoFocus
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink-soft">Grace period (minutes)</span>
          <input
            type="number"
            required
            min={0}
            max={MAX_GRACE}
            step={1}
            inputMode="numeric"
            value={grace}
            onChange={(e) => setGrace(e.target.value)}
            className={INPUT}
          />
        </label>

        <p className="flex items-center gap-2 text-sm font-bold text-sun-700">
          <span className="size-2.5 rounded-full bg-sun-400" />
          {deadline
            ? `Counts as a hit if you log on by ${formatTime12(deadline)}`
            : `Grace must be 0–${MAX_GRACE} minutes`}
        </p>
        <p className="text-xs text-ink-soft">Changes apply to your past days too.</p>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={resetToDefaults} disabled={isDefault} className="px-3">
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
