import { format, parseISO } from 'date-fns'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { formatDuration } from '../../lib/stats'
import { Card, CardLabel } from '../ui/Card'
import { ChartTooltip } from './ChartTooltip'
import { HIT_FILLS } from './days'

const MAX_LABELS = 8
const COUNT_FILLS = { hit: HIT_FILLS[4], light: HIT_FILLS[1] }

// Hours worked per day (or the daily average per week, for long ranges) with
// the goal drawn as a step line that rises each time the goal was raised, so
// the bars and the steps climb together. Same look as the workouts chart.
// `hours` comes from the work summary: { by: 'day' | 'week', bars, counts }.
export function HoursBarsCard({ hours, rangeLabel }) {
  const { by, bars, counts } = hours
  const { ref, tip, show, hide } = useHoverTooltip()

  const maxHours = Math.max(1, ...bars.map((b) => Math.max(b.minutes, b.goal) / 60))
  const top = Math.ceil(maxHours)
  const at = (minutes) => `${(minutes / 60 / top) * 100}%`
  const grid = top > 10 ? 2 : 1
  const goal = bars.at(-1)?.goal ?? 0
  const ticks = [...new Set([0, goal / 60, top])]
  const step = Math.ceil(bars.length / MAX_LABELS)
  const showLabel = (i) => (bars.length - 1 - i) % step === 0
  const pad = bars.length > 20 ? 'px-px' : 'px-[3px]'
  const label = (key) => format(parseISO(key), by === 'day' && bars.length <= 7 ? 'EEE' : 'M/d')

  // the goal as steps: flat across each bar's column, rising between columns
  const steps = bars
    .map((b, i) => `${i ? 'L' : 'M'}${i},${top - b.goal / 60} L${i + 1},${top - b.goal / 60}`)
    .join(' ')

  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <CardLabel>{by === 'day' ? 'Hours per day' : 'Avg hours per day, by week'}</CardLabel>
        <p className="text-sm text-ink-soft">{rangeLabel}</p>
      </div>

      {bars.length === 0 ? (
        <p className="grid flex-1 place-items-center py-12 text-sm text-ink-soft">No work logged yet</p>
      ) : (
        <div className="flex flex-1 flex-col pt-6 pb-4">
          <div className="flex min-h-52 flex-1 gap-3">
            <div ref={ref} className="relative flex-1">
              {Array.from({ length: Math.floor(top / grid) + 1 }, (_, n) => (
                <div
                  key={n}
                  className="absolute inset-x-0 border-t border-line"
                  style={{ bottom: at(n * grid * 60) }}
                />
              ))}

              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 size-full overflow-visible"
                viewBox={`0 0 ${bars.length} ${top}`}
                preserveAspectRatio="none"
              >
                <path
                  d={steps}
                  fill="none"
                  stroke="var(--color-accent-300)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              <div className="absolute inset-0 flex items-end">
                {bars.map((bar) => (
                  <div
                    key={bar.key}
                    className={`group flex h-full flex-1 items-end justify-center ${pad}`}
                    onMouseEnter={(e) => show(e, describe(bar, by))}
                    onMouseLeave={hide}
                  >
                    {bar.minutes > 0 ? (
                      <div
                        className={`w-full max-w-8 origin-bottom animate-grow rounded-md transition-colors ${
                          bar.met
                            ? 'bg-accent-500 group-hover:bg-accent-600'
                            : 'bg-accent-200 group-hover:bg-accent-300'
                        }`}
                        style={{ height: at(bar.minutes) }}
                      />
                    ) : (
                      <div className="h-1 w-full max-w-8 rounded-full bg-empty transition-colors group-hover:bg-miss-dark" />
                    )}
                  </div>
                ))}
              </div>

              <ChartTooltip tip={tip} />
            </div>

            <div className="relative w-12 text-sm tabular-nums">
              {ticks.map((h) => (
                <span
                  key={h}
                  className={`absolute right-0 translate-y-1/2 whitespace-nowrap ${
                    h === goal / 60 ? 'font-bold text-accent-600' : 'text-ink-soft'
                  }`}
                  style={{ bottom: at(h * 60) }}
                >
                  {h === 0 ? '0' : formatDuration(h * 60)}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2 flex pr-15 text-xs text-ink-soft tabular-nums">
            {bars.map((bar, i) => (
              <span key={bar.key} className="flex-1 text-center whitespace-nowrap">
                {showLabel(i) ? label(bar.key) : ''}
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

function describe(bar, by) {
  const goal = `goal ${formatDuration(bar.goal)}`
  if (by === 'week') {
    return {
      date: `Week of ${format(parseISO(bar.key), 'MMM d')}`,
      detail: `avg ${formatDuration(bar.minutes)} a day · ${goal} · met ${bar.metDays} of ${bar.days} days`,
    }
  }
  const date = format(parseISO(bar.key), 'EEE, MMM d')
  if (!bar.minutes) return { date, detail: bar.pending ? `Not started yet · ${goal}` : `No work · ${goal}` }
  const sofar = bar.pending ? ' so far' : ''
  return { date, detail: `${formatDuration(bar.minutes)}${sofar} · ${goal}${bar.met ? ' · goal met' : ''}` }
}
