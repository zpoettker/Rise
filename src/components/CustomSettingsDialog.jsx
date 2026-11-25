import { useState } from 'react'
import { MAX_WEEKLY_GOAL } from '../lib/logins'
import {
  CUSTOM_COLORS,
  CUSTOM_ICON_IDS,
  DEFAULT_CUSTOM,
  MAX_CUSTOM_NAME,
} from '../lib/customConfig'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { SegmentedControl } from './ui/SegmentedControl'
import { CUSTOM_ICONS } from './ui/TrackerIcons'

const GOALS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Days a week' },
]
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
const DAYS = Array.from({ length: MAX_WEEKLY_GOAL }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}))

// Set up the custom tracker (`custom` null = adding it) or change it: name,
// icon, colour and goal. Opened from the All settings or the custom tab's gear.
// Removing it deletes the tab and the days checked off (a second click
// confirms), so a new custom tab starts fresh.
export function CustomSettingsDialog({ custom, daysLogged = 0, onSave, onRemove, onClose }) {
  const [draft, setDraft] = useState(custom ?? DEFAULT_CUSTOM)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const set = (field) => (value) => setDraft((d) => ({ ...d, [field]: value }))
  const name = draft.name.trim()
  const scale = CUSTOM_COLORS[draft.color].scale
  const Icon = CUSTOM_ICONS[draft.icon]
  // the popup previews the picked colour: its toggles and buttons use it
  const theme = Object.fromEntries(STEPS.map((step, i) => [`--color-accent-${step}`, scale[i]]))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (name) onSave({ ...draft, name })
  }

  return (
    <Dialog onClose={onClose} medium>
      <form onSubmit={handleSubmit} className="space-y-5 p-6" style={theme}>
        <div className="flex items-start justify-between gap-4">
          <DialogTitle label={custom ? 'Settings' : 'New tab'}>
            {custom ? 'Your custom tab' : 'Add a custom tab'}
          </DialogTitle>
          {/* live preview of the tab's icon and colour */}
          <span
            className="grid size-14 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: scale[1], color: scale[5] }}
            aria-hidden="true"
          >
            <Icon className="size-7" />
          </span>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-ink-soft">Name</span>
          <input
            type="text"
            required
            autoFocus={!custom}
            maxLength={MAX_CUSTOM_NAME}
            placeholder="e.g. Reading"
            value={draft.name}
            onChange={(e) => set('name')(e.target.value)}
            className="mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 font-display text-2xl placeholder:text-ink-soft/50 focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-200/60"
          />
        </label>

        <fieldset>
          <legend className="text-sm font-semibold text-ink-soft">Icon</legend>
          <div className="mt-1.5 grid grid-cols-8 gap-2">
            {CUSTOM_ICON_IDS.map((id) => {
              const Choice = CUSTOM_ICONS[id]
              const selected = draft.icon === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={id}
                  aria-pressed={selected}
                  onClick={() => set('icon')(id)}
                  className={`grid aspect-square place-items-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
                    selected
                      ? 'border-transparent'
                      : 'border-line bg-white/60 text-ink-soft hover:text-ink'
                  }`}
                  style={selected ? { backgroundColor: scale[1], color: scale[6] } : undefined}
                >
                  <Choice className="size-5" />
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-ink-soft">Colour</legend>
          <div className="mt-1.5 grid grid-cols-8 gap-2">
            {Object.entries(CUSTOM_COLORS).map(([id, color]) => {
              const selected = draft.color === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={color.label}
                  title={color.label}
                  aria-pressed={selected}
                  onClick={() => set('color')(id)}
                  className={`aspect-square rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
                    selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-cream' : ''
                  }`}
                  style={{ backgroundColor: color.scale[4] }}
                />
              )
            })}
          </div>
        </fieldset>

        <div>
          <span className="text-sm font-semibold text-ink-soft">Goal</span>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <SegmentedControl
              label="Goal"
              options={GOALS}
              value={draft.goal}
              onChange={set('goal')}
            />
            {draft.goal === 'weekly' && (
              <SegmentedControl
                label="Days a week"
                options={DAYS}
                value={draft.perWeek}
                onChange={set('perWeek')}
              />
            )}
          </div>
          <span className="mt-1.5 block text-xs text-ink-soft">
            {draft.goal === 'daily'
              ? 'Check it off every day to keep your streak going.'
              : `A Mon–Sun week is on goal once you check it off on ${draft.perWeek} ${
                  draft.perWeek === 1 ? 'day' : 'days'
                }.`}{' '}
            Changes apply to past days too.
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {custom ? (
            <Button
              variant="ghost"
              onClick={confirmRemove ? onRemove : () => setConfirmRemove(true)}
              className={`px-3 ${confirmRemove ? 'text-red-600 hover:text-red-700' : ''}`}
            >
              {confirmRemove
                ? `Delete tab and ${daysLogged} ${daysLogged === 1 ? 'day' : 'days'}?`
                : 'Remove tab'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name}>
              {custom ? 'Save' : 'Add tab'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
