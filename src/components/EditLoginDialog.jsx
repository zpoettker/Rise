import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { describeLogin } from '../lib/stats'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { TrashIcon } from './ui/TrashIcon'

function preview(time, settings) {
  if (!time) return null
  const { hit, detail } = describeLogin(time, settings)
  return { hit, text: hit ? `On target · ${detail}` : detail }
}

export function EditLoginDialog({ date, entry, settings, onSave, onDelete, onClose }) {
  const [time, setTime] = useState(entry?.time ?? settings.targetTime)
  const result = preview(time, settings)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!time) return
    onSave(time)
  }

  return (
    <Dialog onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label={entry ? 'Edit log on' : 'Add log on'}>
          {format(parseISO(date), 'EEEE, MMMM d')}
        </DialogTitle>

        <label className="block">
          <span className="text-sm font-semibold text-ink-soft">Log on time</span>
          <input
            type="time"
            required
            autoFocus
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 font-display text-3xl tabular-nums focus:border-sun-400 focus:outline-none focus:ring-4 focus:ring-sun-200/60"
          />
        </label>

        {result && (
          <p
            className={`flex items-center gap-2 text-sm font-bold ${result.hit ? 'text-sun-700' : 'text-ink-soft'}`}
          >
            <span className={`size-2.5 rounded-full ${result.hit ? 'bg-sun-400' : 'bg-empty'}`} />
            {result.text}
          </p>
        )}

        <div className="flex items-center gap-2">
          {entry && (
            <button
              type="button"
              aria-label="Delete log on"
              title="Delete log on"
              onClick={onDelete}
              className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sun-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500"
            >
              <TrashIcon className="size-5" />
            </button>
          )}
          <Button variant="ghost" onClick={onClose} className="ml-auto">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}
