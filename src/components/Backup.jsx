import { format, parseISO } from 'date-fns'
import { useRef, useState } from 'react'
import { createBackup, parseBackup, toDateKey } from '../lib/logins'
import { Button } from './ui/Button'
import { DialogTitle } from './ui/Dialog'

function download(state) {
  const blob = new Blob([JSON.stringify(createBackup(state), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `rise-backup-${toDateKey(new Date())}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const dayCount = (state) => {
  const n = Object.keys(state.entries).length
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

// Export / import buttons at the bottom of the settings popup. These act right
// away rather than waiting for Save. A valid file is handed to `onPick` so the
// popup can ask before replacing anything.
export function BackupSection({ state, onPick }) {
  const fileInput = useRef(null)
  const [message, setMessage] = useState(null)

  const handleFile = async (event) => {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    try {
      onPick(parseBackup(await file.text()))
    } catch (error) {
      setMessage({ error: true, text: error.message })
    }
  }

  return (
    <section className="space-y-3 border-t border-line p-6">
      <div>
        <h3 className="text-sm font-semibold text-ink-soft">Backup</h3>
        <p className="mt-1 text-xs text-ink-soft">
          Your log-ons live only in this browser. Save a copy in case the cache gets cleared.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            download(state)
            setMessage({ text: `Downloaded ${dayCount(state)} of log-ons.` })
          }}
        >
          Export
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => fileInput.current.click()}>
          Import
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          className={`text-xs font-bold ${message.error ? 'text-ink' : 'text-sun-700'}`}
        >
          {message.text}
        </p>
      )}
    </section>
  )
}

export function ImportConfirm({ current, backup, onConfirm, onCancel }) {
  const keys = Object.keys(backup.entries).sort()
  const span = (key) => format(parseISO(key), 'MMM d, yyyy')

  return (
    <div className="space-y-5 p-6">
      <DialogTitle label="Import backup">Replace your data?</DialogTitle>
      <p className="text-sm text-ink-soft">
        This backup has <strong className="text-ink">{dayCount(backup)}</strong>
        {keys.length > 0 && ` (${span(keys[0])} – ${span(keys.at(-1))})`}. Your current{' '}
        {dayCount(current)} and settings will be replaced. This can't be undone.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Replace</Button>
      </div>
    </div>
  )
}
