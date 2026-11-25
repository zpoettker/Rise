import { format } from 'date-fns'
import { getAllRates, getAllToday, getPerfectDays } from '../lib/all'
import { getTrackers } from '../lib/trackers'
import { AllCalendar } from './charts/AllCalendar'
import { AllHeatmap } from './charts/AllHeatmap'
import { Card, CardLabel } from './ui/Card'
import { TrackerIcon } from './ui/TrackerIcons'

// The All tab: a grey page where each tracker keeps its own colour. Today's
// three rings, each tracker's streak, the past year and a month for all three,
// and how each did over the selected range. Rows and cards open their tab.
export function AllView({ state, range, rangeLabel, today, now, onOpen }) {
  const todayInfo = getAllToday(state, today, now)
  return (
    <div className="space-y-8">
      <TodayCard info={todayInfo} today={today} custom={state.settings.custom} onOpen={onOpen} />

      <div className={`grid gap-4 ${STREAK_COLS[todayInfo.items.length]}`}>
        {todayInfo.items.map((item) => (
          <StreakCard
            key={item.id}
            id={item.id}
            streak={getTrackers(state.settings)[item.id].summary(state, range, today, now).streak}
            label={item.label}
            custom={state.settings.custom}
            onOpen={onOpen}
          />
        ))}
      </div>

      <AllHeatmap state={state} today={today} />

      <div className="grid gap-4 md:grid-cols-2">
        <AllCalendar state={state} today={today} />
        <RatesCard
          state={state}
          range={range}
          rangeLabel={rangeLabel}
          today={today}
          onOpen={onOpen}
        />
      </div>
    </div>
  )
}

// Today: three rings (morning outside, workout, work inside) next to a row per
// tracker. Morning's ring is all or nothing; workout fills with the week;
// work fills with today's hours.
function TodayCard({ info, today, custom, onOpen }) {
  return (
    <Card className="flex flex-wrap items-center gap-x-10 gap-y-6">
      <Rings items={info.items} done={info.done} total={info.total} />
      <div className="min-w-64 flex-1 space-y-1">
        <CardLabel>Today</CardLabel>
        <h2 className="text-2xl font-semibold">{format(today, 'EEEE, MMMM d')}</h2>
        <ul className="mt-3 divide-y divide-line">
          {info.items.map((item) => {
            return (
              <li key={item.id} data-tracker={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-accent-500 ${
                    item.applies ? '' : 'opacity-50'
                  }`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-600">
                    <TrackerIcon id={item.id} custom={custom} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{item.label}</span>
                    <span className="block truncate text-xs text-ink-soft">{item.detail}</span>
                  </span>
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {item.value}
                  </span>
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full ${
                      item.done ? 'bg-accent-500 text-white' : 'border-2 border-line'
                    }`}
                    aria-label={item.done ? 'Done' : 'Not done yet'}
                  >
                    {item.done && <Check />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}

// one streak card per shown tracker
const STREAK_COLS = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 md:grid-cols-4',
}

// grows with a fourth ring (the custom tracker) so the middle keeps its room
const RING_SIZES = { 1: 168, 2: 168, 3: 168, 4: 200 }

function Rings({ items, done, total }) {
  const RING = { size: RING_SIZES[items.length], stroke: 14, gap: 4 }
  const c = RING.size / 2
  return (
    <div className="relative mx-auto shrink-0" style={{ width: RING.size, height: RING.size }}>
      <svg viewBox={`0 0 ${RING.size} ${RING.size}`} className="-rotate-90" aria-hidden="true">
        {items.map((item, i) => {
          const r = c - RING.stroke / 2 - i * (RING.stroke + RING.gap)
          const length = 2 * Math.PI * r
          return (
            <g key={item.id} data-tracker={item.id}>
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                strokeWidth={RING.stroke}
                className="stroke-accent-100"
              />
              {item.progress > 0 && (
                <circle
                  cx={c}
                  cy={c}
                  r={r}
                  fill="none"
                  strokeWidth={RING.stroke}
                  strokeLinecap="round"
                  strokeDasharray={length}
                  strokeDashoffset={length * (1 - item.progress)}
                  className="ring-fill stroke-accent-400"
                  style={{ '--ring-length': length, animationDelay: `${150 + i * 120}ms` }}
                />
              )}
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <p className="font-display text-3xl font-semibold leading-none tabular-nums">
          {done}
          <span className="text-ink-soft">/{total}</span>
        </p>
      </div>
    </div>
  )
}

// The tracker's name up top (short enough for four in a row), its current
// streak big, and the best one below. Daily trackers count days.
function StreakCard({ id, label, custom, streak, onOpen }) {
  const unitName = streak.unit ?? 'day'
  const unit = (n) => (n === 1 ? unitName : `${unitName}s`)
  return (
    <button
      type="button"
      data-tracker={id}
      onClick={() => onOpen(id)}
      className="min-w-0 rounded-3xl text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
    >
      <Card className="h-full">
        <div className="flex items-center justify-between gap-2">
          <CardLabel>
            <span className="block truncate">{label}</span>
          </CardLabel>
          <TrackerIcon id={id} custom={custom} className="size-5 shrink-0 text-accent-500" />
        </div>
        <p className="mt-2 font-display text-5xl font-semibold tabular-nums text-accent-600">
          {streak.current}
          <span className="ml-1.5 font-sans text-lg font-bold text-ink-soft">
            {unit(streak.current)}
          </span>
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Streak · best {streak.best} {unit(streak.best)}
        </p>
      </Card>
    </button>
  )
}

// How each tracker did over the range, in its own terms, plus perfect days
function RatesCard({ state, range, rangeLabel, today, onOpen }) {
  const rates = getAllRates(state, range, today)
  const perfect = getPerfectDays(state, range, today)
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <CardLabel>On goal</CardLabel>
          <h2 className="mt-1 text-2xl font-semibold">By tracker</h2>
        </div>
        <p className="text-sm text-ink-soft">{rangeLabel}</p>
      </div>

      <ul className="flex-1 space-y-4">
        {rates.map((r) => {
          const percent = r.rate == null ? null : Math.round(r.rate * 100)
          return (
            <li key={r.id} data-tracker={r.id}>
              <button
                type="button"
                onClick={() => onOpen(r.id)}
                className="block w-full rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-500"
              >
                <span className="flex items-center gap-2">
                  <TrackerIcon
                    id={r.id}
                    custom={state.settings.custom}
                    className="size-4 text-accent-500"
                  />
                  <span className="text-sm font-bold">{r.label}</span>
                  <span className="ml-auto font-display text-xl font-semibold tabular-nums">
                    {percent == null ? '–' : `${percent}%`}
                  </span>
                </span>
                <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-accent-100">
                  <span
                    className="bar-in block h-full rounded-full bg-accent-400"
                    style={{ width: `${percent ?? 0}%` }}
                  />
                </span>
                <span className="mt-1 block text-xs text-ink-soft">{r.caption}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex gap-4 border-t border-line pt-4 text-sm text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-stone-700" />
          <span>
            <span className="font-bold text-ink">{perfect.count}</span> perfect{' '}
            {perfect.count === 1 ? 'day' : 'days'}
          </span>
        </span>
        <span>
          Best run <span className="font-bold text-ink">{perfect.best}</span>
        </span>
      </div>
    </Card>
  )
}

function Check() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
