import { useState } from 'react'
import { CastleCard } from './components/charts/CastleCard'
import { HitRateCard } from './components/charts/HitRateCard'
import { HoursBarsCard } from './components/charts/HoursBarsCard'
import { MonthCalendar } from './components/charts/MonthCalendar'
import { WeekProgressCard } from './components/charts/WeekProgressCard'
import { WeeklyBarsCard } from './components/charts/WeeklyBarsCard'
import { WeekTimelineCard } from './components/charts/WeekTimelineCard'
import { WeightCard } from './components/charts/WeightCard'
import { WeekEditDialog } from './components/WeekEditDialog'
import { WorkoutDayDialog } from './components/WorkoutDayDialog'
import { WeighInDialog, WeightGoalDialog } from './components/WeightDialogs'
import { YearHeatmap } from './components/charts/YearHeatmap'
import { EditLoginDialog } from './components/EditLoginDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { WorkoutSettingsDialog } from './components/WorkoutSettingsDialog'
import { WorkSettingsDialog } from './components/WorkSettingsDialog'
import { WorkTimerCard } from './components/WorkTimerCard'
import { Card, CardLabel } from './components/ui/Card'
import { GearIcon } from './components/ui/GearIcon'
import { SegmentedControl } from './components/ui/SegmentedControl'
import { Sun } from './components/ui/Sun'
import { DumbbellIcon, LaptopIcon, SunIcon, TRACKER_ICONS } from './components/ui/TrackerIcons'
import { useCelebration } from './hooks/useCelebration'
import { useNow } from './hooks/useNow'
import { useLoginData } from './hooks/useLoginData'
import { useTrackerTab } from './hooks/useTrackerTab'
import { dayOf, deleteLogin, isMorningDay, setLoginTime, toDateKey, updateSettings } from './lib/logins'
import { describeLogin, greeting, isNewBestToday } from './lib/stats'
import { deleteWeight, saveWeight } from './lib/weights'
import { setDayWorkouts } from './lib/workouts'
import { TRACKER_LIST, TRACKERS } from './lib/trackers'

const TAB_OPTIONS = [
  { value: 'morning', label: 'Morning', icon: SunIcon },
  { value: 'workout', label: 'Workout', icon: DumbbellIcon },
  { value: 'work', label: 'Work', icon: LaptopIcon },
  { value: 'all', label: 'All' },
]

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
  const [tab, setTab] = useTrackerTab()
  const [range, setRange] = useState('30d')
  const [editingDate, setEditingDate] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // a Work day ('yyyy-MM-dd') whose week is open in the edit popup
  const [editingWeek, setEditingWeek] = useState(null)
  // a day ('yyyy-MM-dd') whose workouts are open in the popup
  const [editingWorkouts, setEditingWorkouts] = useState(null)
  // null, 'goal', or { weight } (weight null = adding a new weigh-in)
  const [weightDialog, setWeightDialog] = useState(null)
  const today = dayOf(new Date(), state.settings)
  const todayKey = toDateKey(today)
  const todayEntry = state.entries[todayKey]
  const todayResult = todayEntry && describeLogin(todayEntry.time, state.settings)
  const tracker = TRACKERS[tab] ?? null
  // ticks every second while the work timer runs, so today's numbers count live
  // (and every minute otherwise, so the greeting keeps up with the time of day)
  const now = useNow(Boolean(state.timer?.startedAt))
  const summary = tracker?.summary(state, range, today, now)
  // the celebrations belong to the morning; they wait until that tab is shown
  const isMorning = tab === 'morning'
  const { celebrate, preview } = useCelebration(todayKey, isMorning && Boolean(todayResult?.hit))
  const newBest = isMorning && (preview || isNewBestToday(state, today))

  const morningLine = todayEntry ? (
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
  ) : !isMorningDay(today, state.settings) ? (
    'Enjoy your weekend'
  ) : (
    `Not logged on yet · target ${state.settings.targetTime}`
  )

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      {celebrate && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh] animate-dawn [animation-delay:500ms] bg-[radial-gradient(ellipse_90%_70%_at_20%_0%,#ffd98a_0%,#ffe9bf_40%,transparent_75%)]"
        />
      )}

      <header className="flex animate-rise items-center gap-6">
        <HeaderIcon tab={tab} celebrate={celebrate} />
        <div>
          <h1 className="text-5xl font-semibold tracking-tight">
            {tracker?.heading?.(state, today) ??
              `${greeting(new Date(now), state.settings)}${state.settings.name ? `, ${state.settings.name}` : ''}`}
          </h1>
          {tab === 'all' ? (
            <ul className="mt-2 space-y-0.5 text-ink-soft">
              {TRACKER_LIST.map((t) => (
                <li key={t.id} data-tracker={t.id} className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full bg-accent-400" />
                  <span>
                    {t.id === 'morning' ? morningLine : t.summary(state, range, today, now).line}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-lg text-ink-soft">{isMorning ? morningLine : summary.line}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => setSettingsOpen(true)}
          className="group ml-auto grid size-11 shrink-0 place-items-center self-start rounded-full text-ink-soft transition-colors hover:bg-accent-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
        >
          <GearIcon className="size-6 transition-transform duration-500 group-hover:rotate-90" />
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Tracker" options={TAB_OPTIONS} value={tab} onChange={setTab} />
        <SegmentedControl label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      {tracker ? (
        <div key={tab} className="animate-rise space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {summary.streakCard !== false && (
              <StreakCard streak={summary.streak} newBest={newBest} celebrate={celebrate} />
            )}
            {summary.cards.map((card) => (
              <StatCard key={card.label} card={card} />
            ))}
          </div>

          {summary.week && <WeekProgressCard week={summary.week} onSelectDay={setEditingWorkouts} />}
          {tab === 'work' && <WorkTimerCard state={state} setState={setState} />}
          {summary.castle && <CastleCard castle={summary.castle} />}

          {!tracker.heatmapLast && <YearHeatmap tracker={tracker} state={state} today={today} />}

          <div className="grid gap-4 md:grid-cols-2">
            <MonthCalendar
              tracker={tracker}
              state={state}
              today={today}
              onSelectDay={
                { morning: setEditingDate, workout: setEditingWorkouts, work: setEditingWeek }[tab]
              }
            />
            {summary.weekly ? (
              <WeeklyBarsCard weekly={summary.weekly} rangeLabel={RANGE_LABELS[range]} />
            ) : summary.hours ? (
              <HoursBarsCard hours={summary.hours} rangeLabel={RANGE_LABELS[range]} />
            ) : (
              <HitRateCard rate={summary.rate} rangeLabel={RANGE_LABELS[range]} />
            )}
          </div>

          {tab === 'workout' && (
            <WeightCard
              state={state}
              range={range}
              rangeLabel={RANGE_LABELS[range]}
              today={today}
              onAdd={() => setWeightDialog({ weight: null })}
              onEdit={(weight) => setWeightDialog({ weight })}
              onGoal={() => setWeightDialog('goal')}
            />
          )}

          {summary.extra && <MoreStatsCard stats={summary.extra} />}
          {tab === 'work' && (
            <WeekTimelineCard state={state} today={today} now={now} onEdit={setEditingWeek} />
          )}

          {tracker.heatmapLast && <YearHeatmap tracker={tracker} state={state} today={today} />}
        </div>
      ) : (
        <AllPreview state={state} range={range} today={today} onOpen={setTab} />
      )}

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

      {editingWeek && (
        <WeekEditDialog
          key={editingWeek}
          state={state}
          setState={setState}
          today={today}
          now={now}
          day={editingWeek}
          onClose={() => setEditingWeek(null)}
        />
      )}

      {editingWorkouts && (
        <WorkoutDayDialog
          key={editingWorkouts}
          date={editingWorkouts}
          state={state}
          today={today}
          now={now}
          onClose={() => setEditingWorkouts(null)}
          onSave={(rows) => {
            setState((s) => setDayWorkouts(s, editingWorkouts, rows))
            setEditingWorkouts(null)
          }}
        />
      )}

      {weightDialog === 'goal' && (
        <WeightGoalDialog
          settings={state.settings}
          onClose={() => setWeightDialog(null)}
          onSave={(settings) => {
            setState((s) => updateSettings(s, settings))
            setWeightDialog(null)
          }}
        />
      )}
      {weightDialog && weightDialog !== 'goal' && (
        <WeighInDialog
          weight={weightDialog.weight}
          unit={state.settings.weightUnit}
          lastKg={state.weights.at(-1)?.kg}
          onClose={() => setWeightDialog(null)}
          onSave={(weight) => {
            setState((s) => saveWeight(s, weight))
            setWeightDialog(null)
          }}
          onDelete={() => {
            setState((s) => deleteWeight(s, weightDialog.weight.id))
            setWeightDialog(null)
          }}
        />
      )}

      {settingsOpen && (tab === 'morning' || tab === 'all') && (
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
      {settingsOpen && tab === 'workout' && (
        <WorkoutSettingsDialog
          settings={state.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) => {
            setState((s) => updateSettings(s, settings))
            setSettingsOpen(false)
          }}
        />
      )}
      {settingsOpen && tab === 'work' && (
        <WorkSettingsDialog
          settings={state.settings}
          today={today}
          onClose={() => setSettingsOpen(false)}
          onSave={(update) => {
            setState(update)
            setSettingsOpen(false)
          }}
        />
      )}
    </main>
  )
}

// Big picture next to the greeting: the animated sun for Morning, the tab's
// icon in its colour for Workout and Work, and all three together for All.
function HeaderIcon({ tab, celebrate }) {
  if (tab === 'morning') return <Sun size={112} celebrate={celebrate} />

  const glow =
    'absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-accent-200)_0%,transparent_68%)]'
  if (tab === 'all') {
    return (
      <div aria-hidden="true" className="relative size-28 shrink-0">
        <div className={glow} />
        {[
          ['morning', 'left-1/2 top-3 -translate-x-1/2'],
          ['workout', 'bottom-4 left-3'],
          ['work', 'bottom-4 right-3'],
        ].map(([id, position]) => {
          const Icon = TRACKER_ICONS[id]
          return (
            <span key={id} data-tracker={id} className={`absolute ${position}`}>
              <Icon className="size-10 text-accent-500" />
            </span>
          )
        })}
      </div>
    )
  }

  const Icon = TRACKER_ICONS[tab]
  return (
    <div aria-hidden="true" className="relative grid size-28 shrink-0 place-items-center">
      <div className={glow} />
      <Icon className="relative size-19 text-accent-500" strokeWidth={1.75} />
    </div>
  )
}

// Current streak, with the new-best shimmer and pill on a morning that beats it.
function StreakCard({ streak, newBest, celebrate }) {
  return (
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
            className={`rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-bold text-accent-700 ${celebrate ? 'animate-rise [animation-delay:2000ms]' : ''}`}
          >
            New best!
          </span>
        )}
      </div>
      <p
        className={`mt-2 font-display text-5xl font-semibold tabular-nums text-accent-600 ${newBest && celebrate ? 'origin-left animate-pop [animation-delay:2200ms]' : ''}`}
      >
        {streak.current}
        <Unit unit={streak.unit} value={streak.current} />
        {streak.current > 0 && streak.current === streak.best && (
          <span className="ml-2 text-4xl" role="img" aria-label="High score">
            🔥
          </span>
        )}
      </p>
    </Card>
  )
}

// A top stat card. Optional: `unit` ('week' → weeks), `sub` (small line
// under the number), `accent` (number in the tab colour) and `badge` (a
// "New record!" pill with a 🔥).
function StatCard({ card }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <CardLabel>{card.label}</CardLabel>
        {card.badge && (
          <span className="animate-rise rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-bold text-accent-700">
            {card.badge}
          </span>
        )}
      </div>
      <p
        className={`mt-2 font-display text-5xl font-semibold tabular-nums ${card.accent ? 'text-accent-600' : ''}`}
      >
        {card.value}
        <Unit unit={card.unit} value={card.value} />
        {card.badge && (
          <span className="ml-2 text-4xl" role="img" aria-label="New record">
            🔥
          </span>
        )}
      </p>
      {card.sub && <p className="mt-1 text-sm text-ink-soft">{card.sub}</p>}
    </Card>
  )
}

// Extra numbers in one card, as a grid of small stats
function MoreStatsCard({ stats }) {
  return (
    <Card>
      <CardLabel>More stats</CardLabel>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm font-semibold text-ink-soft">{stat.label}</dt>
            <dd className="mt-0.5 font-display text-3xl font-semibold tabular-nums">
              {stat.value}
              {stat.unit && (
                <span className="ml-1.5 font-sans text-base font-bold text-ink-soft">
                  {stat.value === 1 ? stat.unit : `${stat.unit}s`}
                </span>
              )}
            </dd>
            {stat.sub && <dd className="text-xs text-ink-soft">{stat.sub}</dd>}
          </div>
        ))}
      </dl>
    </Card>
  )
}

// Small 'weeks' after a number, for streaks counted in weeks
function Unit({ unit, value }) {
  if (!unit) return null
  return (
    <span className="ml-1.5 font-sans text-lg font-bold text-ink-soft">
      {value === 1 ? unit : `${unit}s`}
    </span>
  )
}

// The All tab until the combined view is built: each tracker's streak in its
// own colour. Clicking one opens its tab.
function AllPreview({ state, range, today, onOpen }) {
  return (
    <div className="animate-rise space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {TRACKER_LIST.map((t) => {
          const { streak } = t.summary(state, range, today)
          return (
            <button
              key={t.id}
              type="button"
              data-tracker={t.id}
              onClick={() => onOpen(t.id)}
              className="rounded-3xl text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <Card className="h-full">
                <CardLabel>{t.label} streak</CardLabel>
                <p className="mt-2 font-display text-5xl font-semibold tabular-nums text-accent-600">
                  {streak.current}
                  <Unit unit={streak.unit} value={streak.current} />
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Best {streak.best}
                  {streak.unit ? ` ${streak.best === 1 ? streak.unit : `${streak.unit}s`}` : ''}
                </p>
              </Card>
            </button>
          )
        })}
      </div>
      <p className="text-center text-sm text-ink-soft">
        A combined heatmap and calendar for all three is coming soon.
      </p>
    </div>
  )
}

export default App
