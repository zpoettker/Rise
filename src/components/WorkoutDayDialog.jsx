import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { formatDuration } from '../lib/stats'
import { overlappingWorkouts, placeWorkout, workoutsOn } from '../lib/workouts'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { TrashIcon } from './ui/TrashIcon'

const LENGTH = 60 // minutes, for a new workout

const clock = (minute) => {
  const m = ((minute % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// A new workout's times: right after the last one, or on today (nothing logged
// yet) ending now, so a workout you just finished is one tap. Else 6–7 PM.
function newRow(rows, settings, nowMinute) {
  let start
  if (rows.length) start = placeWorkout(rows.at(-1), settings).end + LENGTH
  else if (nowMinute != null) start = Math.max(nowMinute - LENGTH, 0)
  else start = 18 * 60
  return {
    id: crypto.randomUUID(),
    start: clock(start),
    end: clock(start + LENGTH),
  }
}

// One day's workouts, like the morning log-on popup: each workout's start and
// end time can be changed, removed with the trash icon, or added with
// "Add workout". Nothing is saved until Save. A day with no workouts opens
// with one ready to fill in.
export function WorkoutDayDialog({ date, state, today, now, onSave, onClose }) {
  const { settings } = state
  // on today, new workouts default to ending at the current time (5 min steps)
  const nowMinute =
    date === format(today, 'yyyy-MM-dd')
      ? Math.floor((new Date(now).getHours() * 60 + new Date(now).getMinutes()) / 5) * 5
      : null
  const saved = workoutsOn(state, date)
  const [rows, setRows] = useState(() => (saved.length ? saved : [newRow([], settings, nowMinute)]))
  const overlaps = overlappingWorkouts(rows, settings)
  const total = rows.reduce((sum, r) => sum + placeWorkout(r, settings).minutes, 0)

  const update = (id, field, value) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (overlaps.size || rows.some((r) => !r.start || !r.end)) return
    onSave(rows)
  }

  return (
    <Dialog onClose={onClose} medium>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <DialogTitle label={saved.length ? 'Edit workouts' : 'Add workout'}>
          {format(parseISO(date), 'EEEE, MMMM d')}
        </DialogTitle>

        {rows.length ? (
          <ul className="space-y-2">
            {rows.map((row, i) => {
              const bad = overlaps.has(row.id)
              const { minutes } = placeWorkout(row, settings)
              return (
                <li
                  key={row.id}
                  className={`flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 ${
                    bad ? 'border-red-300' : 'border-line'
                  }`}
                >
                  <TimeInput
                    label={`Workout ${i + 1} start`}
                    value={row.start}
                    autoFocus={i === rows.length - 1 && !saved.length}
                    onChange={(v) => update(row.id, 'start', v)}
                  />
                  <span className="text-ink-soft">–</span>
                  <TimeInput
                    label={`Workout ${i + 1} end`}
                    value={row.end}
                    onChange={(v) => update(row.id, 'end', v)}
                  />
                  <span className="ml-auto text-sm font-bold whitespace-nowrap text-ink-soft tabular-nums">
                    {row.start && row.end ? formatDuration(minutes) : ''}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete workout ${i + 1}`}
                    title="Delete workout"
                    onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-accent-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
                  >
                    <TrashIcon className="size-[18px]" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-soft">
            No workouts · rest day
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, newRow(rs, settings, nowMinute)])}
            className="rounded-full px-1 text-sm font-bold text-accent-700 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-500"
          >
            + Add workout
          </button>
          <p
            className={`text-sm font-bold ${overlaps.size ? 'text-red-600' : 'text-ink-soft'}`}
            aria-live="polite"
          >
            {overlaps.size
              ? 'Workouts overlap'
              : rows.length
                ? `${rows.length} ${rows.length === 1 ? 'workout' : 'workouts'} · ${formatDuration(total)}`
                : ''}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={overlaps.size > 0}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function TimeInput({ label, value, onChange, autoFocus }) {
  return (
    <input
      type="time"
      required
      aria-label={label}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-[8.75rem] rounded-xl border border-transparent bg-transparent px-1.5 py-1 font-display text-lg tabular-nums hover:border-line focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-200/60"
    />
  )
}
