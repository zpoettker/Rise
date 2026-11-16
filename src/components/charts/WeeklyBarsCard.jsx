import { format, parseISO } from 'date-fns'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { formatDuration } from '../../lib/stats'
import { Card, CardLabel } from '../ui/Card'
import { ChartTooltip } from './ChartTooltip'
import { HIT_FILLS } from './days'

const MAX_LABELS = 8
const COUNT_FILLS = { hit: HIT_FILLS[4], light: HIT_FILLS[1] }

// Workout days per Mon–Sun week for the selected range, with a line at the
// weekly goal. Weeks that reach the goal are solid; the rest are light.
// `weekly` comes from the workout summary: { weeks, goal, counts }.
export function WeeklyBarsCard({ weekly, rangeLabel }) {
  const { weeks, goal, counts } = weekly
  const { ref, tip, show, hide } = useHoverTooltip()

  const top = Math.max(goal, 1, ...weeks.map((w) => w.days))
  const at = (value) => `${(value / top) * 100}%`
  const ticks = [...new Set([0, goal, top])]
  // with many weeks, label every few so the dates don't collide (newest always shown)
  const step = Math.ceil(weeks.length / MAX_LABELS)
  const showLabel = (i) => (weeks.length - 1 - i) % step === 0
  const gap = weeks.length > 20 ? 'gap-0.5' : 'gap-1.5'

  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <CardLabel>Workouts per week</CardLabel>
        <p className="text-sm text-ink-soft">{rangeLabel}</p>
      </div>

      {weeks.length === 0 ? (
        <p className="grid flex-1 place-items-center py-12 text-sm text-ink-soft">
          No workouts yet
        </p>
      ) : (
        <div className="flex flex-1 flex-col pt-6 pb-4">
          <div className="flex min-h-52 flex-1 gap-3">
            <div ref={ref} className="relative flex-1">
              {Array.from({ length: top + 1 }, (_, n) => (
                <div
                  key={n}
                  className="absolute inset-x-0 border-t border-line"
                  style={{ bottom: at(n) }}
                />
              ))}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 border-t-2 border-accent-300"
                style={{ bottom: at(goal) }}
              />

              <div className={`absolute inset-0 flex items-end ${gap}`}>
                {weeks.map((week) => (
                  <div
                    key={week.start}
                    className="group flex h-full flex-1 items-end justify-center"
                    onMouseEnter={(e) => show(e, describeWeek(week, goal))}
                    onMouseLeave={hide}
                  >
                    {week.days > 0 ? (
                      <div
                        className={`w-full max-w-8 origin-bottom animate-grow rounded-md transition-colors ${
                          week.days >= goal
                            ? 'bg-accent-500 group-hover:bg-accent-600'
                            : 'bg-accent-200 group-hover:bg-accent-300'
                        }`}
                        style={{ height: at(week.days) }}
                      />
                    ) : (
                      <div className="h-1 w-full max-w-8 rounded-full bg-empty transition-colors group-hover:bg-miss-dark" />
                    )}
                  </div>
                ))}
              </div>

              <ChartTooltip tip={tip} />
            </div>

            <div className="relative w-4 text-sm tabular-nums">
              {ticks.map((n) => (
                <span
                  key={n}
                  className={`absolute right-0 translate-y-1/2 ${
                    n === goal ? 'font-bold text-accent-600' : 'text-ink-soft'
                  }`}
                  style={{ bottom: at(n) }}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          <div className={`mt-2 flex ${gap} pr-7 text-xs text-ink-soft tabular-nums`}>
            {weeks.map((week, i) => (
              <span key={week.start} className="flex-1 text-center whitespace-nowrap">
                {showLabel(i) ? format(parseISO(week.start), 'M/d') : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 border-t border-line pt-4 text-sm text-ink-soft">
        {counts.map(({ kind, value, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            {COUNT_FILLS[kind] && <span className={`size-2.5 rounded-full ${COUNT_FILLS[kind]}`} />}
            <span className="font-bold text-ink">{value}</span> {label}
          </span>
        ))}
      </div>
    </Card>
  )
}

function describeWeek(week, goal) {
  const date = `Week of ${format(parseISO(week.start), 'MMM d')}`
  if (!week.days) return { date, detail: week.status === 'pending' ? 'No workouts yet' : 'No workouts' }
  const days = `${week.days} workout ${week.days === 1 ? 'day' : 'days'}`
  const met = week.days >= goal ? ' · goal met' : ''
  return { date, detail: `${days} · ${formatDuration(week.minutes)}${met}` }
}
