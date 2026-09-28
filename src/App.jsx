import { useState } from 'react'
import { MonthCalendar } from './components/charts/MonthCalendar'
import { YearHeatmap } from './components/charts/YearHeatmap'
import { Button } from './components/ui/Button'
import { Card, CardLabel } from './components/ui/Card'
import { SegmentedControl } from './components/ui/SegmentedControl'
import { Sun } from './components/ui/Sun'
import { useLoginData } from './hooks/useLoginData'
import { toDateKey } from './lib/logins'
import { getStats } from './lib/stats'

// Temporary style guide for Phase 3; replaced by the dashboard in Phase 4.

const SUN_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
const STATUSES = [
  ['Hit', 'bg-sun-400'],
  ['Missed / no data', 'bg-empty'],
]
const RANGE_OPTIONS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
]

function App() {
  const [state] = useLoginData()
  const [range, setRange] = useState('30d')
  const today = state.entries[toDateKey(new Date())]
  const stats = getStats(state, range)

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <header className="flex animate-rise items-center gap-6">
        <Sun size={112} />
        <div>
          <h1 className="text-5xl font-semibold tracking-tight">Good Morning, Zach</h1>
          <p className="mt-2 text-lg text-ink-soft">
            {today ? `You logged on at ${today.time}` : 'Enjoy your weekend'} · target{' '}
            {state.settings.targetTime}
          </p>
        </div>
      </header>

      <div className="flex justify-end">
        <SegmentedControl label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardLabel>Current streak</CardLabel>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums text-sun-600">
            {stats.currentStreak}
            {stats.currentStreak > 0 && stats.currentStreak === stats.bestStreak && (
              <span className="ml-2 text-4xl" role="img" aria-label="High score">
                🔥
              </span>
            )}
          </p>
        </Card>
        <Card>
          <CardLabel>Best streak</CardLabel>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums">{stats.bestStreak}</p>
        </Card>
        <Card>
          <CardLabel>Avg log on</CardLabel>
          <p className="mt-2 font-display text-5xl font-semibold tabular-nums">
            {stats.averageTime ?? '–'}
          </p>
        </Card>
      </div>

      <YearHeatmap state={state} />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <MonthCalendar state={state} />

      <Card className="space-y-6">
        <div>
          <CardLabel>Sun scale</CardLabel>
          <div className="mt-3 flex overflow-hidden rounded-2xl">
            {SUN_SHADES.map((shade) => (
              <div
                key={shade}
                className="h-12 flex-1"
                style={{ background: `var(--color-sun-${shade})` }}
                title={`sun-${shade}`}
              />
            ))}
          </div>
        </div>

        <div>
          <CardLabel>Day statuses</CardLabel>
          <div className="mt-3 flex flex-wrap gap-4">
            {STATUSES.map(([name, bg]) => (
              <span key={name} className="flex items-center gap-2 text-sm font-semibold">
                <span className={`size-4 rounded-md ${bg}`} />
                {name}
              </span>
            ))}
          </div>
        </div>

        <div>
          <CardLabel>Buttons</CardLabel>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button>Save</Button>
            <Button variant="outline">Export data</Button>
            <Button variant="ghost">Cancel</Button>
          </div>
        </div>
      </Card>
      </div>
    </main>
  )
}

export default App
