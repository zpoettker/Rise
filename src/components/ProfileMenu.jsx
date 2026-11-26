import { useEffect, useRef, useState } from 'react'

// The profile button in the header, next to the gear: your initial (or a
// person icon before a name is set) in a soft circle. It opens a small menu
// that will hold account features once there's a backend (Stage 4: sign in,
// sync across devices, sign out). For now it shows who you are, a "coming
// soon" sign-in row, and a shortcut to the app settings.
export function ProfileMenu({ name, onSettings }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initial = name.trim().charAt(0).toUpperCase()

  // close on a click outside or Esc
  useEffect(() => {
    if (!open) return
    const onPointer = (e) => !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Profile"
        title="Profile"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-full transition-colors hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
      >
        <Avatar initial={initial} className="size-8 text-sm" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-72 animate-rise rounded-2xl border border-line bg-cream p-2 shadow-soft"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar initial={initial} className="size-10 text-base" />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{name.trim() || 'Your profile'}</p>
              <p className="text-xs text-ink-soft">Saved on this device</p>
            </div>
          </div>

          <div className="my-1 border-t border-line" />

          <div
            role="menuitem"
            aria-disabled="true"
            className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 text-sm text-ink-soft"
          >
            <span>Sign in to sync your devices</span>
            <span className="shrink-0 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-bold text-accent-700">
              Soon
            </span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSettings()
            }}
            className="w-full rounded-xl px-2 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-accent-500"
          >
            Name, tabs &amp; backup
          </button>
        </div>
      )}
    </div>
  )
}

// A round badge with your initial, or a person outline (Lucide "user", ISC
// license) when there's no name yet
function Avatar({ initial, className }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-accent-100 font-bold text-accent-700 ring-1 ring-accent-200 ${className}`}
      aria-hidden="true"
    >
      {initial || (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-[60%]"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </span>
  )
}
