import { addDays, eachWeekOfInterval, format, startOfDay, startOfWeek, subWeeks } from 'date-fns'
import { useEffect, useRef } from 'react'
import { toDateKey } from '../../lib/logins'
import { Card, CardLabel } from '../ui/Card'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { ChartTooltip } from './ChartTooltip'
import { DayLegend } from './DayLegend'
import { daysByDate } from '../../lib/trackers'
import { dayFill, HEATMAP_MISS_FILL, MISS_FILL } from './days'

const CELL = 11
const GAP = 3
const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']

// Weeks (Mon-start) covering the past year; each week holds its 5 weekdays,
// or all 7 days when the tracker counts weekends.
function buildWeeks(today, length) {
  const start = startOfWeek(subWeeks(today, 52), { weekStartsOn: 1 })
  return eachWeekOfInterval({ start, end: today }, { weekStartsOn: 1 }).map((weekStart) =>
    Array.from({ length }, (_, i) => addDays(weekStart, i)),
  )
}

function monthLabel(weeks, i) {
  const month = weeks[i][0].getMonth()
  if (i === 0) return weeks[1]?.[0].getMonth() === month ? format(weeks[0][0], 'MMM') : ''
  return weeks[i - 1][0].getMonth() !== month ? format(weeks[i][0], 'MMM') : ''
}

export function YearHeatmap({ tracker, state, today = new Date() }) {
  return (
    <Card>
      <HeatmapBody tracker={tracker} state={state} today={today} title="Past year" />
    </Card>
  )
}

// The heatmap without its card, so the All tab can stack all three in one.
// `title` is the label on the left of the header row (text or a node).
export function HeatmapBody({ tracker, state, today = new Date(), title }) {
  const { ref, tip, show, hide } = useHoverTooltip()
  const scrollRef = useRef(null)

  const end = startOfDay(today)
  const rows = tracker.showsWeekends(state.settings) ? 7 : 5
  const weeks = buildWeeks(end, rows)
  const days = daysByDate(tracker, state, weeks[0][0], today)
  const summary = tracker.yearSummary(Object.values(days))

  // start scrolled to the most recent weeks on narrow screens
  useEffect(() => {
    const el = scrollRef.current
    el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        {typeof title === 'string' ? <CardLabel>{title}</CardLabel> : title}
        <p className="text-sm text-ink-soft">
          <span className="font-bold text-ink">{summary.value}</span> {summary.label}
        </p>
      </div>

      <div ref={ref} className="relative">
        <div ref={scrollRef} className="overflow-x-auto pb-1">
          <div
            className="inline-grid text-[10px] font-semibold text-ink-soft"
            style={{
              gridTemplateColumns: `28px repeat(${weeks.length}, ${CELL}px)`,
              gridTemplateRows: `16px repeat(${rows}, ${CELL}px)`,
              gap: GAP,
            }}
          >
            {/* covers the corner so month names scroll under it */}
            <span
              aria-hidden="true"
              className="sticky left-0 z-10 bg-white shadow-[3px_0_0_white]"
              style={{ gridColumn: 1, gridRow: 1 }}
            />
            {weeks.map((_, i) => (
              <span
                key={`m${i}`}
                className="whitespace-nowrap leading-none"
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                {monthLabel(weeks, i)}
              </span>
            ))}

            {WEEKDAY_LABELS.slice(0, rows).map((label, row) => (
              <span
                key={`d${row}`}
                className="sticky left-0 z-10 bg-white leading-[11px] shadow-[3px_0_0_white]"
                style={{ gridColumn: 1, gridRow: row + 2 }}
              >
                {label}
              </span>
            ))}

            {weeks.flatMap((week, col) =>
              week.map((date, row) => {
                if (date > end) return null
                const key = toDateKey(date)
                const day = days[key] ?? { date: key, status: 'empty', time: null }
                const { date: label, detail } = tracker.describe(day, state.settings)
                const fill = dayFill(day)
                return (
                  <div
                    key={key}
                    role="img"
                    aria-label={`${label}: ${detail}`}
                    onMouseEnter={(e) => show(e, { date: label, detail })}
                    onMouseLeave={hide}
                    className={`rounded-[3px] ${fill === MISS_FILL ? HEATMAP_MISS_FILL : (fill ?? 'bg-empty')} ${
                      day.status === 'pending' ? 'ring-1 ring-accent-500 ring-inset' : ''
                    }`}
                    style={{ gridColumn: col + 2, gridRow: row + 2 }}
                  />
                )
              }),
            )}
          </div>
        </div>
        <ChartTooltip tip={tip} />
      </div>

      <DayLegend legend={tracker.legend} />
    </div>
  )
}
