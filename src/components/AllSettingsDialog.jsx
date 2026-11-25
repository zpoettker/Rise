import { useState } from 'react'
import { MAX_NAME_LENGTH, TRACKER_IDS } from '../lib/logins'
import { formatTime12, toMinutes } from '../lib/stats'
import { getTrackers } from '../lib/trackers'
import { BackupSection, ImportConfirm } from './Backup'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { TrackerIcon } from './ui/TrackerIcons'

const INPUT =
  'mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 font-display text-2xl tabular-nums placeholder:text-ink-soft/50 focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-200/60'

// The gear on the All tab: settings for the whole app. Your name, when a new
// day starts, which tracker tabs are shown (at least one), and backups.
export function AllSettingsDialog({ state, onSave, onImport, onCustom, onClose }) {
  const { settings } = state
  const trackers = getTrackers(settings)
  const ids = settings.custom ? [...TRACKER_IDS, 'custom'] : TRACKER_IDS
  const [pendingImport, setPendingImport] = useState(null)
  const [name, setName] = useState(settings.name)
  const [dayStart, setDayStart] = useState(settings.dayStart)
  const [enabled, setEnabled] = useState(settings.enabledTrackers)

  // the day has to start before the morning target, or a hit would be impossible
  const validDayStart = dayStart && toMinutes(dayStart) < toMinutes(settings.targetTime)
  const valid = validDayStart && enabled.length > 0

  const toggle = (id) =>
    setEnabled((list) =>
      list.includes(id)
        ? list.filter((t) => t !== id)
        : ids.filter((t) => t === id || list.includes(t)),
    )

  const handleSubmit = (event) => {
    event.preventDefault()
    if (valid) onSave({ name: name.trim(), dayStart, enabledTrackers: enabled })
  }

  if (pendingImport) {
    return (
      <Dialog onClose={onClose} medium>
        <ImportConfirm
          current={state}
          backup={pendingImport}
          onConfirm={() => onImport(pendingImport)}
          onCancel={() => setPendingImport(null)}
        />
      </Dialog>
    )
  }

  return (
    <Dialog onClose={onClose} medium>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label="Settings">Rise</DialogTitle>

        <label className="block">
          <span className="text-sm font-semibold text-ink-soft">Your name</span>
          <input
            type="text"
            autoComplete="given-name"
            placeholder="For the greeting"
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink-soft">New day starts at</span>
          <input
            type="time"
            required
            value={dayStart}
            onChange={(e) => setDayStart(e.target.value)}
            className={INPUT}
          />
          <span
            className={`mt-1.5 block text-xs ${validDayStart || !dayStart ? 'text-ink-soft' : 'font-bold text-ink'}`}
          >
            {!dayStart
              ? ''
              : validDayStart
                ? `Anything before ${formatTime12(dayStart)} (a late work session, a log-on) belongs to the day before.`
                : `The day has to start before your morning target (${formatTime12(settings.targetTime)}).`}
          </span>
        </label>

        <fieldset>
          <legend className="text-sm font-semibold text-ink-soft">Tabs shown</legend>
          <div
            className={`mt-1.5 grid gap-2 ${ids.length === 4 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}
          >
            {ids.map((id) => {
              const on = enabled.includes(id)
              return (
                <label
                  key={id}
                  data-tracker={id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-colors ${
                    on ? 'border-accent-300 bg-accent-50' : 'border-line bg-white/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(id)}
                    className="size-4 shrink-0 cursor-pointer accent-accent-500"
                  />
                  <TrackerIcon
                    id={id}
                    custom={settings.custom}
                    className={`size-5 shrink-0 ${on ? 'text-accent-500' : 'text-ink-soft'}`}
                  />
                  <span
                    className={`truncate text-sm font-bold ${on ? 'text-ink' : 'text-ink-soft'}`}
                  >
                    {trackers[id].label}
                  </span>
                </label>
              )
            })}
          </div>
          <span
            className={`mt-1.5 block text-xs ${enabled.length ? 'text-ink-soft' : 'font-bold text-ink'}`}
          >
            {enabled.length
              ? 'Hidden trackers leave the tab bar and the All tab. Their data is kept.'
              : 'Keep at least one tracker.'}
          </span>
          <button
            type="button"
            onClick={onCustom}
            className="mt-3 rounded-full px-1 text-sm font-bold text-accent-700 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-500"
          >
            {settings.custom
              ? `Edit your custom tab (${settings.custom.name})`
              : '+ Add a custom tab'}
          </button>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            Save
          </Button>
        </div>
      </form>
      <BackupSection state={state} onPick={setPendingImport} />
    </Dialog>
  )
}
