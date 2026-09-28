import { format, parseISO } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { isHit, toMinutes } from '../lib/stats'
import { Button } from './ui/Button'

function preview(time, settings) {
  if (!time) return null
  const diff = toMinutes(settings.targetTime) - toMinutes(time)
  if (!isHit(time, settings)) return { hit: false, text: `${-diff} min late` }
  if (diff > 0) return { hit: true, text: `On target · ${diff} min early` }
  if (diff === 0) return { hit: true, text: 'On target · right on time' }
  return { hit: true, text: `On target · within grace` }
}

export function EditLoginDialog({ date, entry, settings, onSave, onClose }) {
  const ref = useRef(null)
  const [time, setTime] = useState(entry?.time ?? settings.targetTime)
  const result = preview(time, settings)

  useEffect(() => {
    if (!ref.current.open) ref.current.showModal()
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!time) return
    onSave(time)
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(24rem,calc(100%-2rem))] animate-rise rounded-3xl border border-line bg-cream p-0 text-ink shadow-soft backdrop:bg-ink/25 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
            {entry ? 'Edit log on' : 'Add log on'}
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{format(parseISO(date), 'EEEE, MMMM d')}</h2>
        </div>

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

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </dialog>
  )
}
