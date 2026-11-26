import { useEffect, useRef, useState } from 'react'
import { signOut } from '../lib/auth'

// The profile button in the header, next to the gear: your initial (or a
// person icon before a name is set) in a soft circle. Its menu is where your
// account lives: your email and Sign out (signing in happens on the login
// page before the app opens). In the demo (`demo`) it offers to create an
// account instead. Data still lives on this device until syncing is built.
export function ProfileMenu({ name, session, demo, onSettings }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const email = session?.user?.email ?? ''
  const initial = (name.trim() || email).charAt(0).toUpperCase()

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
        aria-label={session ? `Profile (signed in as ${email})` : 'Profile'}
        title={session ? `Signed in as ${email}` : 'Profile'}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-accent-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
      >
        <Avatar initial={initial} className="size-8 text-sm" />
        {session && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 bottom-1.5 size-2.5 rounded-full bg-leaf-500 ring-2 ring-cream"
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-72 animate-rise rounded-2xl border border-line bg-cream p-2 shadow-soft"
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar initial={initial} className="size-10 text-base" />
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
            <SignedIn />
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

// Signed in: syncing comes next, then Sign out
function SignedIn() {
  const [busy, setBusy] = useState(false)
  return (
    <>
      <p className="px-2 py-1.5 text-xs text-ink-soft">
        Your data is still saved on this device. Syncing it to your account is coming next.
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

// A round badge with your initial, or a person outline (Lucide "user", ISC
// license) when there's no name or email yet
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
