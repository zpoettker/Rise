import { useEffect, useRef, useState } from 'react'
import { signOut } from '../lib/auth'

// The profile button in the header, next to the gear: a person icon in a soft
// circle. It only gets a badge when something's wrong (changes not reaching
// the account); the menu shows the sync status either way. Its menu is where your
// account lives: your email and Sign out (signing in happens on the login
// page before the app opens). In the demo (`demo`) it offers to create an
// account instead. `syncStatus` ('saved' | 'saving' | 'offline') says whether
// your changes have reached the account.
export function ProfileMenu({ name, session, demo, syncStatus, onSettings }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const email = session?.user?.email ?? ''
  const offline = syncStatus === 'offline'

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
        aria-label={offline ? 'Profile (offline, changes not synced yet)' : 'Profile'}
        title={offline ? "Offline: changes will sync when you're back" : 'Profile'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
      >
        <Avatar className="size-8" />
        {offline && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-sun-500 text-[10px] font-black text-white ring-2 ring-cream"
          >
            !
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-72 animate-rise rounded-2xl border border-line bg-cream p-2 shadow-soft"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="size-10" />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">
                {name.trim() || email || 'Your profile'}
              </p>
              <p className="truncate text-xs text-ink-soft">
                {session
                  ? name.trim()
                    ? email
                    : 'Signed in'
                  : demo
                    ? 'Demo'
                    : 'Saved on this device'}
              </p>
            </div>
          </div>

          <div className="my-1 border-t border-line" />

          {session ? (
            <SignedIn syncStatus={syncStatus} />
          ) : demo ? (
            <div className="space-y-2 px-2 py-2">
              <p className="text-xs text-ink-soft">
                You&apos;re trying the demo with sample data. Nothing you change is saved.
              </p>
              <a
                href="./?signup"
                role="menuitem"
                className="block w-full rounded-xl bg-gradient-to-b from-accent-400 to-accent-500 px-3 py-2 text-center text-sm font-bold text-white shadow-soft hover:from-accent-500 hover:to-accent-600"
              >
                Create your account
              </a>
            </div>
          ) : null}

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

// Signed in: whether changes have synced, then Sign out
const SYNC_LABELS = {
  saved: ['bg-leaf-500', 'Synced to your account'],
  saving: ['bg-sun-400 animate-pulse', 'Saving…'],
  offline: ['bg-sun-500', "Offline: changes will sync when you're back"],
}

function SignedIn({ syncStatus }) {
  const [busy, setBusy] = useState(false)
  const [dot, label] = SYNC_LABELS[syncStatus] ?? SYNC_LABELS.saved
  return (
    <>
      <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-ink-soft" role="status">
        <span className={`size-2 shrink-0 rounded-full ${dot}`} />
        {label}
      </p>
      <button
        type="button"
        role="menuitem"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await signOut()
          } finally {
            setBusy(false)
          }
        }}
        className="w-full rounded-xl px-2 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-accent-500 disabled:opacity-60"
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </>
  )
}

// A person outline (Lucide "user", ISC license) in a soft circle
function Avatar({ className }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700 ring-1 ring-accent-200 ${className}`}
      aria-hidden="true"
    >
      {
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
      }
    </span>
  )
}
