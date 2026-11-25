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
import { AllSettingsDialog } from './components/AllSettingsDialog'
import { CustomSettingsDialog } from './components/CustomSettingsDialog'
import { CustomTheme } from './components/ui/CustomTheme'
import { MorningSettingsDialog } from './components/MorningSettingsDialog'
import { AllView } from './components/AllView'
import { WorkoutSettingsDialog } from './components/WorkoutSettingsDialog'
import { WorkSettingsDialog } from './components/WorkSettingsDialog'
import { WorkTimerCard } from './components/WorkTimerCard'
import { Card, CardLabel } from './components/ui/Card'
import { GearIcon } from './components/ui/GearIcon'
import { SegmentedControl } from './components/ui/SegmentedControl'
import { Sun } from './components/ui/Sun'
import {
  DumbbellIcon,
  LaptopIcon,
  CUSTOM_ICONS,
  RingsIcon,
  SunIcon,
  TrackerIcon,
} from './components/ui/TrackerIcons'
import { useCelebration } from './hooks/useCelebration'
import { useGoalCelebration } from './hooks/useGoalCelebration'
import { useNow } from './hooks/useNow'
import { useLoginData } from './hooks/useLoginData'
import { useTrackerTab } from './hooks/useTrackerTab'
import { dayOf, deleteLogin, isMorningDay, setLoginTime, toDateKey, updateSettings } from './lib/logins'
import { describeLogin, greeting, isNewBestToday } from './lib/stats'
import { deleteWeight, saveWeight } from './lib/weights'
import { allHeading, getAllToday } from './lib/all'
import { setDayWorkouts } from './lib/workouts'
import { getTrackers } from './lib/trackers'
import { toggleCustomDay, toggleCustomSlip } from './lib/custom'

const TAB_OPTIONS = [
  { value: 'morning', label: 'Morning', icon: SunIcon },
  { value: 'workout', label: 'Workout', icon: DumbbellIcon },
  { value: 'work', label: 'Work', icon: LaptopIcon },
]

// the shown tracker tabs (the custom one with its own name and icon), then All
function tabOptions(settings) {
  const options = [...TAB_OPTIONS]
  if (settings.custom) {
    options.push({ value: 'custom', label: settings.custom.name, icon: CUSTOM_ICONS[settings.custom.icon] })
  }
  return [...options.filter((o) => settings.enabledTrackers.includes(o.value)), { value: 'all', label: 'All' }]
}

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
  const enabled = state.settings.enabledTrackers
  const [tab, setTab] = useTrackerTab(enabled)
  const [range, setRange] = useState('30d')
  const [editingDate, setEditingDate] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // a Work day ('yyyy-MM-dd') whose week is open in the edit popup
  const [editingWeek, setEditingWeek] = useState(null)
  // a day ('yyyy-MM-dd') whose workouts are open in the popup
  const [editingWorkouts, setEditingWorkouts] = useState(null)
  // the custom tab's setup popup: null, 'new' or 'edit'
  const [customDialog, setCustomDialog] = useState(null)
  // null, 'goal', or { weight } (weight null = adding a new weigh-in)
  const [weightDialog, setWeightDialog] = useState(null)
  const today = dayOf(new Date(), state.settings)
  const todayKey = toDateKey(today)
  const todayEntry = state.entries[todayKey]
  const todayResult = todayEntry && describeLogin(todayEntry.time, state.settings)
  const tracker = getTrackers(state.settings)[tab] ?? null
  // ticks every second while the work timer runs, so today's numbers count live
  // (and every minute otherwise, so the greeting keeps up with the time of day)
  const now = useNow(Boolean(state.timer?.startedAt))
  const summary = tracker?.summary(state, range, today, now)
  // today at a glance for every tracker: the All tab, and which goals are met
  const glance = getAllToday(state, today, now)
  const allToday = tab === 'all' ? glance : null
  // the celebrations belong to the morning; they wait until that tab is shown
  const isMorning = tab === 'morning'
  const { celebrate, preview } = useCelebration(todayKey, isMorning && Boolean(todayResult?.hit))
  const newBest = isMorning && (preview || isNewBestToday(state, today))
  // the header icon's goal celebration: plays the first time a tab is shown
  // after its goal is met (right away when you complete it there), and again
  // on a click while it's met. Workout: worked out today or the week's goal is
  // met; all: a perfect day.
  const metById = {
    ...Object.fromEntries(glance.items.map((item) => [item.id, item.done])),
    // a habit you're breaking is on track by itself, so it doesn't celebrate
    ...(state.settings.custom?.goal === 'quit' && { custom: false }),
    all: glance.total > 0 && glance.done === glance.total,
  }
  const goalMet = Boolean(metById[tab])
  const goal = useGoalCelebration(tab, metById, todayKey)
  const openTab = (next) => {
    goal.reset()
    setTab(next)
  }

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
      <CustomTheme custom={state.settings.custom} />
      {celebrate && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh] animate-dawn [animation-delay:500ms] bg-[radial-gradient(ellipse_90%_70%_at_20%_0%,#ffd98a_0%,#ffe9bf_40%,transparent_75%)]"
        />
      )}

      <header className="flex animate-rise items-center gap-6">
        <HeaderIcon
          tab={tab}
          settings={state.settings}
          celebrate={celebrate}
          met={goalMet}
          playing={goal.playing}
          playKey={goal.playKey}
          onReplay={goal.replay}
        />
        <div>
          <h1 className="text-5xl font-semibold tracking-tight">
            {tracker?.heading?.(state, today) ??
              (allToday && allHeading(allToday)) ??
              `${greeting(new Date(now), state.settings)}${state.settings.name ? `, ${state.settings.name}` : ''}`}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">
            {allToday
              ? `${allToday.done} of ${allToday.total} done today`
              : isMorning
                ? morningLine
                : summary.line}
          </p>
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
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="Tracker"
            options={tabOptions(state.settings)}
            value={tab}
            onChange={openTab}
          />
          {/* the custom tab's check-off sits beside the tabs, so the header
              keeps the same height as every other tab */}
          {tab === 'custom' && (
            <CheckOffButton
              done={summary.doneToday}
              habit={tracker.habit}
              onClick={() => setState((s) => toggleToday(s, todayKey))}
            />
          )}
        </div>
        <SegmentedControl label="Range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      {tracker ? (
        <div key={tab} className="animate-rise space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {summary.streakCard !== false && (
              <StreakCard streak={summary.streak} newBest={newBest} celebrate={celebrate} />
            )}
            {summary.cards.map((card) => (
              <StatCard key={card.label} card={card} compact={compactCards(summary.cards)} />
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
                {
                  morning: setEditingDate,
                  workout: setEditingWorkouts,
                  work: setEditingWeek,
                  custom: (date) => setState((s) => toggleToday(s, date)),
                }[tab]
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
        <div key="all" className="animate-rise">
          <AllView
            state={state}
            range={range}
            rangeLabel={RANGE_LABELS[range]}
            today={today}
            now={now}
            onOpen={openTab}
          />
        </div>
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

      {settingsOpen && tab === 'morning' && (
        <MorningSettingsDialog
          settings={state.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) => {
            setState((s) => updateSettings(s, settings))
            setSettingsOpen(false)
          }}
        />
      )}
      {settingsOpen && tab === 'all' && (
        <AllSettingsDialog
          state={state}
          onCustom={() => {
            setSettingsOpen(false)
            setCustomDialog(state.settings.custom ? 'edit' : 'new')
          }}
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
      {(customDialog || (settingsOpen && tab === 'custom')) && (
        <CustomSettingsDialog
          custom={customDialog === 'new' ? null : state.settings.custom}
          todayKey={todayKey}
          daysLogged={Object.keys(state.customLog ?? {}).length + Object.keys(state.customSlips ?? {}).length}
          onClose={() => {
            setCustomDialog(null)
            setSettingsOpen(false)
          }}
          onSave={(custom) => {
            setState((s) => updateSettings(s, { custom, enabledTrackers: withCustom(s.settings, true) }))
            setCustomDialog(null)
            setSettingsOpen(false)
          }}
          onRemove={() => {
            setState((s) => ({
              ...updateSettings(s, { custom: null, enabledTrackers: withCustom(s.settings, false) }),
              customLog: {},
              customSlips: {},
            }))
            setCustomDialog(null)
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
// icon in its colour for the others (a target for All). When the goal is met
// it celebrates (`playing`; `playKey` restarts it) and becomes a button that
// plays it again:
//   workout: the dumbbell lifts and slams down · work: the laptop pops and a
//   check draws on its screen · custom: grows with a wiggle · all: the target
//   turns and an arrow flies into the bullseye (and stays for the day)
function HeaderIcon({ tab, settings, celebrate, met, playing, playKey, onReplay }) {
  const glow =
    'absolute inset-0 rounded-full bg-[radial-gradient(circle,var(--color-accent-200)_0%,transparent_68%)]'
  const icon = 'relative size-19 text-accent-500'

  let art
  if (tab === 'morning') {
    art = <Sun key={playKey} size={112} celebrate={celebrate || playing} />
  } else if (tab === 'all') {
    art = (
      <>
        <div className={glow} />
        <span key={playKey} className="relative grid place-items-center">
          <RingsIcon
            className={`${icon} ${playing ? 'animate-target-turn' : met ? '-rotate-[35deg]' : ''}`}
            strokeWidth={1.75}
          />
          {met && <Arrow className={`absolute inset-0 size-19 ${playing ? 'animate-arrow-in' : ''}`} />}
        </span>
      </>
    )
  } else {
    const motion = playing
      ? { workout: 'animate-dumbbell-slam', work: 'animate-laptop-pop', custom: 'animate-wiggle-grow' }[tab]
      : ''
    art = (
      <>
        <div className={glow} />
        <span key={playKey} className="relative grid place-items-center">
          {playing && tab === 'work' && (
            <span className="absolute inset-0 m-auto size-16 animate-screen-glow rounded-full bg-[radial-gradient(circle,var(--color-accent-300)_0%,transparent_70%)]" />
          )}
          {playing && tab === 'custom' && (
            <span className="absolute inset-0 m-auto size-20 animate-ripple rounded-full border-2 border-accent-300" />
          )}
          <span className={`relative ${motion}`}>
            <TrackerIcon id={tab} custom={settings.custom} className={icon} strokeWidth={1.75} />
            {tab === 'work' && met && <ScreenCheck animate={playing} />}
          </span>
          {playing && tab === 'workout' && (
            <span className="absolute -bottom-1 left-1/2 h-1.5 w-16 -translate-x-1/2 animate-impact rounded-full bg-accent-300" />
          )}
        </span>
      </>
    )
  }

  const box = 'relative grid size-28 shrink-0 place-items-center'
  if (!met) {
    return (
      <div aria-hidden="true" className={box}>
        {art}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onReplay}
      aria-label="Goal met! Play the celebration again"
      title="Goal met! Click to celebrate again"
      className={`${box} cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500`}
    >
      {art}
    </button>
  )
}

// The arrow in the All tab's bullseye: its tip sits at the middle of the
// icon, the shaft and fletching run off to the top right
function Arrow({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`origin-center overflow-visible text-ink ${className}`}
      aria-hidden="true"
    >
      <path d="M12 12 23 1" />
      <path d="M21 5.4h-2.3V3.1M23.3 3.4H21V1.1" />
    </svg>
  )
}

// The check that draws itself on the laptop's screen
function ScreenCheck({ animate }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute inset-0 size-19 text-accent-600"
      aria-hidden="true"
    >
      <path
        d="M9 10.5l2.2 2.2L15.5 8.5"
        pathLength={1}
        strokeDasharray={1}
        className={animate ? 'animate-draw-check' : ''}
      />
    </svg>
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
// A long value with the 🔥 badge (e.g. "10h 53m 🔥") doesn't fit a third of
// the row at full size, so then the whole row of values steps down a size
function compactCards(cards) {
  return cards.some((card) => String(card.value).length + (card.badge ? 2 : 0) >= 9)
}

function StatCard({ card, compact = false }) {
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
        className={`mt-2 font-display font-semibold whitespace-nowrap tabular-nums ${compact ? 'text-4xl' : 'text-5xl'} ${card.accent ? 'text-accent-600' : ''}`}
      >
        {card.value}
        <Unit unit={card.unit} value={card.value} />
        {card.badge && (
          <span className={`ml-2 ${compact ? 'text-3xl' : 'text-4xl'}`} role="img" aria-label="New record">
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

// The shown trackers after the custom tab is saved (`on`) or removed
function withCustom(settings, on) {
  const rest = settings.enabledTrackers.filter((id) => id !== 'custom')
  if (!on) return rest.length ? rest : ['morning', 'workout', 'work']
  // editing keeps it shown or hidden as it was; a new one is shown
  return settings.custom ? settings.enabledTrackers : [...rest, 'custom']
}

// The custom tab's button beside the tab bar: "Mark today done" (turns into
// "✓ Done today · undo"), or for a habit you're breaking a quiet "I slipped
// today" (turns into "Slipped today · undo"). As tall as the tab bar.
function CheckOffButton({ done, habit, onClick }) {
  const label = habit
    ? done
      ? 'I slipped today'
      : 'Slipped today'
    : done
      ? '✓ Done today'
      : 'Mark today done'
  // the strong, filled look is for the thing to do next
  const strong = habit ? false : !done
  const undo = habit ? !done : done
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={habit ? !done : done}
      className={`inline-flex h-[42px] items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
        strong
          ? 'bg-gradient-to-b from-accent-400 to-accent-500 text-white shadow-soft hover:from-accent-500 hover:to-accent-600'
          : habit && done
            ? 'border border-line bg-white/60 text-ink-soft hover:border-accent-300 hover:text-ink'
            : 'bg-accent-100 text-accent-700 hover:bg-accent-200'
      }`}
    >
      {label}
      {undo && <span className="font-semibold text-accent-600">· undo</span>}
    </button>
  )
}

// Today's (or a calendar day's) tick on the custom tab: a check-off, or a slip
// for a habit you're breaking
function toggleToday(state, date) {
  return state.settings.custom?.goal === 'quit'
    ? toggleCustomSlip(state, date)
    : toggleCustomDay(state, date)
}

export default App
