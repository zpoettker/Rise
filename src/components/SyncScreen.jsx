import { signOut } from '../lib/auth'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Sun } from './ui/Sun'

// What shows instead of the app while the account's data is on its way
// (`sync.phase` 'loading'), when it couldn't be reached ('error'), or for the
// one-time question on a new account ('offer'): upload the data this device
// had from before accounts, or start fresh.
export function SyncScreen({ sync }) {
  if (sync.phase === 'loading') {
    return (
      <main className="grid min-h-svh place-items-center px-6" aria-busy="true">
        <div className="flex animate-rise flex-col items-center gap-4 text-ink-soft">
          <Sun size={72} />
          <p className="text-sm font-semibold">Loading your data…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="grid min-h-svh place-items-center px-6 py-12">
      <Card className="w-full max-w-md animate-rise space-y-5">
        {sync.phase === 'error' ? (
          <>
            <div>
              <h1 className="text-2xl font-semibold">Couldn&apos;t reach your account</h1>
              <p className="mt-2 text-sm text-ink-soft">
                Check your connection and try again. Your data is safe in your account.
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => signOut()} className="px-3">
                Sign out
              </Button>
              <Button onClick={sync.retry}>Try again</Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-semibold">Bring your history with you?</h1>
              <p className="mt-2 text-sm text-ink-soft">
                This device has Rise data from before you had an account:
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {[
                  [sync.offer.counts.mornings, 'morning log-on', 'morning log-ons'],
                  [sync.offer.counts.workouts, 'workout', 'workouts'],
                  [sync.offer.counts.sessions, 'work session', 'work sessions'],
                  [sync.offer.counts.weights, 'weigh-in', 'weigh-ins'],
                ]
                  .filter(([n]) => n > 0)
                  .map(([n, one, many]) => (
                    <li key={one} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-accent-400" />
                      <span>
                        <span className="font-bold tabular-nums">{n}</span> {n === 1 ? one : many}
                      </span>
                    </li>
                  ))}
                <li className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent-400" />
                  your settings and goals
                </li>
              </ul>
              <p className="mt-3 text-sm text-ink-soft">
                Upload it to your account to keep your streaks and charts. It&apos;s a one-time
                step.
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={sync.startFresh} className="px-3">
                Start fresh
              </Button>
              <Button onClick={sync.upload}>Upload my data</Button>
            </div>
          </>
        )}
      </Card>
    </main>
  )
}
