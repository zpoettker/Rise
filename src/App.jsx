import { isWeekend } from 'date-fns'
import { useState } from 'react'
import { HitRateCard } from './components/charts/HitRateCard'
import { MonthCalendar } from './components/charts/MonthCalendar'
import { YearHeatmap } from './components/charts/YearHeatmap'
import { EditLoginDialog } from './components/EditLoginDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { Card, CardLabel } from './components/ui/Card'
import { GearIcon } from './components/ui/GearIcon'
import { SegmentedControl } from './components/ui/SegmentedControl'
import { Sun } from './components/ui/Sun'
import { useCelebration } from './hooks/useCelebration'
import { useLoginData } from './hooks/useLoginData'
import { dayOf, deleteLogin, setLoginTime, toDateKey, updateSettings } from './lib/logins'
import { describeLogin, getStats, isNewBestToday } from './lib/stats'

const RANGE_OPTIONS = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
]
const RANGE_LABELS = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

function App() {
  const [state, setState] = useLoginData()
  const [range, setRange] = useState('30d')
  const [editingDate, setEditingDate] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const today = dayOf(new Date(), state.settings)
  const todayKey = toDateKey(today)
  const todayEntry = state.entries[todayKey]
  const todayResult = todayEntry && describeLogin(todayEntry.time, state.settings)
  const stats = getStats(state, range, today)
  const { celebrate, preview } = useCelebration(todayKey, Boolean(todayResult?.hit))
  const newBest = preview || isNewBestToday(state, today)

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      {celebrate && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh] animate-dawn [animation-delay:500ms] bg-[radial-gradient(ellipse_90%_70%_at_20%_0%,#ffd98a_0%,#ffe9bf_40%,transparent_75%)]"
        />
      )}

      <header className="flex animate-rise items-center gap-6">
        <Sun size={112} celebrate={celebrate} />
        <div>
          <h1 className="text-5xl font-semibold tracking-tight">Good Morning, Zach</h1>
          <p className="mt-2 text-lg text-ink-soft">
            {todayEntry ? (
              <>
                You logged on at {todayEntry.time} ·{' '}
                <span
                  className={
                    todayResult.hit
                      ? `font-bold text-sun-700 ${celebrate ? 'inline-block animate-rise [animation-delay:1500ms]' : ''}`
                      : ''
                  }
                >
                  {todayResult.detail}
                </span>
              </>
            ) : isWeekend(today) ? (
              'Enjoy your weekend'
            ) : (
              `Not logged on yet · target ${state.settings.targetTime}`
            )}
          </p>
        </div>
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => setSettingsOpen(true)}
          className="group ml-auto grid size-11 shrink-0 place-items-center self-start rounded-full text-ink-soft transition-colors hover:bg-sun-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500"
        >
          <GearIcon className="size-6 transition-transform duration-500 group-hover:rotate-90" />
        </button>
      </header>

      <div className="flex justify-end">
        <SegmentedControl label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={newBest ? 'relative overflow-hidden' : ''}>
          {newBest && celebrate && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_30%,rgb(255_200_87/0.5)_50%,transparent_70%)] bg-size-[250%_100%] [animation-delay:2000ms]"
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <CardLabel>Current streak</CardLabel>
            {newBest && (
              <span
                className={`rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-bold text-sun-700 ${celebrate ? 'animate-rise [animation-delay:2000ms]' : ''}`}
              >
                New best!
              </span>
            )}
          </div>
          <p
            className={`mt-2 font-display text-5xl font-semibold tabular-nums text-sun-600 ${newBest && celebrate ? 'origin-left animate-pop [animation-delay:2200ms]' : ''}`}
          >
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

      <YearHeatmap state={state} today={today} />

      <div className="grid gap-4 md:grid-cols-2">
        <MonthCalendar state={state} today={today} onSelectDay={setEditingDate} />
        <HitRateCard stats={stats} rangeLabel={RANGE_LABELS[range]} />
      </div>

      {editingDate && (
        <EditLoginDialog
          key={editingDate}
          date={editingDate}
          entry={state.entries[editingDate]}
          settings={state.settings}
          onClose={() => setEditingDate(null)}
          onSave={(time) => {
            setState((s) => setLoginTime(s, editingDate, time))
            setEditingDate(null)
          }}
          onDelete={() => {
            setState((s) => deleteLogin(s, editingDate))
            setEditingDate(null)
          }}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          state={state}
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) => {
            setState((s) => updateSettings(s, settings))
            setSettingsOpen(false)
          }}
          onImport={(imported) => {
            setState(imported)
            setSettingsOpen(false)
          }}
        />
      )}
    </main>
  )
}

export default App
