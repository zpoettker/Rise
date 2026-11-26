import { useState } from 'react'
import { sendMagicLink } from '../lib/auth'
import { Card } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'
import { Sun } from './ui/Sun'
import { DumbbellIcon, LaptopIcon, SunIcon } from './ui/TrackerIcons'

const MODES = [
  { value: 'login', label: 'Log in' },
  { value: 'signup', label: 'Sign up' },
]

const INPUT =
  'mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 text-base placeholder:text-ink-soft/50 focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-200/60'

// The only way into the app (besides the demo): log in or sign up with an
// emailed magic link, no password. Signing up asks for your name too, for
// the greeting. `?signup` in the address opens on Sign up.
export function AuthPage() {
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).has('signup') ? 'signup' : 'login',
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')
  const signup = mode === 'signup'

  const switchMode = (next) => {
    setMode(next)
    setStatus('idle')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('sending')
    try {
      await sendMagicLink(email.trim(), { create: signup, name: name.trim() })
      setStatus('sent')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  return (
    <main className="mx-auto grid min-h-svh max-w-4xl items-center gap-10 px-6 py-12 md:grid-cols-[1fr_24rem]">
      <section className="animate-rise space-y-6">
        <div className="flex items-center gap-4">
          <Sun size={88} />
          <h1 className="text-6xl font-semibold tracking-tight">Rise</h1>
        </div>
        <p className="max-w-md text-xl text-ink-soft">
          Your mornings, workouts and deep work in one calm place. Build the streaks that build you.
        </p>
        <ul className="space-y-3 text-ink-soft">
          {[
            [SunIcon, 'morning', 'Log on early and watch your streak grow'],
            [DumbbellIcon, 'workout', 'Hit your workouts every week'],
            [LaptopIcon, 'work', 'Time your focus and raise the bar'],
          ].map(([Icon, id, text]) => (
            <li key={id} data-tracker={id} className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-accent-100 text-accent-600">
                <Icon className="size-5" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <Card className="animate-rise space-y-5 [animation-delay:120ms]">
        {status === 'sent' ? (
          <div className="space-y-3 py-2" role="status">
            <h2 className="text-2xl font-semibold">Check your email</h2>
            <p className="text-sm text-ink-soft">
              We sent a {signup ? 'link to finish signing up' : 'sign-in link'} to{' '}
              <span className="font-bold text-ink">{email.trim()}</span>. Open it on this device and
              you&apos;ll land right in Rise.
            </p>
            <p className="text-xs text-ink-soft">
              Nothing there? Check spam, or wait a minute and send it again.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="text-sm font-bold text-accent-700 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-500"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <SegmentedControl
              label="Log in or sign up"
              options={MODES}
              value={mode}
              onChange={switchMode}
            />
            <div>
              <h2 className="text-2xl font-semibold">
                {signup ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {signup
                  ? "No password needed: we'll email you a link to finish."
                  : "We'll email you a link to log in. No password needed."}
              </p>
            </div>

            {signup && (
              <label className="block">
                <span className="text-sm font-semibold text-ink-soft">Your name</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  placeholder="For the greeting"
                  maxLength={30}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT}
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-semibold text-ink-soft">Email</span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
              />
            </label>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-full bg-gradient-to-b from-accent-400 to-accent-500 px-5 py-3 font-bold text-white shadow-soft transition-colors hover:from-accent-500 hover:to-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:opacity-60"
            >
              {status === 'sending'
                ? 'Sending…'
                : signup
                  ? 'Email me a sign-up link'
                  : 'Email me a login link'}
            </button>

            {status === 'error' && (
              <p role="alert" className="text-sm font-bold text-ink">
                {error}{' '}
                {!signup && error.includes('Sign up') && (
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-accent-700 underline decoration-accent-300 underline-offset-4"
                  >
                    Sign up
                  </button>
                )}
              </p>
            )}
          </form>
        )}

        <div className="border-t border-line pt-4 text-center text-sm text-ink-soft">
          Just looking?{' '}
          <a
            href="?demo"
            className="font-bold text-accent-700 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-500"
          >
            Try the demo
          </a>
        </div>
      </Card>
    </main>
  )
}
