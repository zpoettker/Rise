import { addDays, eachWeekOfInterval, format, startOfDay, startOfWeek, subWeeks } from 'date-fns'
import { useEffect, useRef } from 'react'
import { toDateKey } from '../../lib/logins'
import { Card, CardLabel } from '../ui/Card'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { ChartTooltip } from './ChartTooltip'
import { DayLegend } from './DayLegend'
import { dayFill, daysByDate, describeDay } from './days'

const CELL = 11
const GAP = 3
const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri']

// Weeks (Mon-start) covering the past year; each week holds its 5 weekdays.
function buildWeeks(today) {
  const start = startOfWeek(subWeeks(today, 52), { weekStartsOn: 1 })
  return eachWeekOfInterval({ start, end: today }, { weekStartsOn: 1 }).map((weekStart) =>
    Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
  )
}

function monthLabel(weeks, i) {
  const month = weeks[i][0].getMonth()
  if (i === 0) return weeks[1]?.[0].getMonth() === month ? format(weeks[0][0], 'MMM') : ''
  return weeks[i - 1][0].getMonth() !== month ? format(weeks[i][0], 'MMM') : ''
}

export function YearHeatmap({ state, today = new Date() }) {
  const { ref, tip, show, hide } = useHoverTooltip()
  const scrollRef = useRef(null)

  const end = startOfDay(today)
  const weeks = buildWeeks(end)
  const days = daysByDate(state, weeks[0][0], today)
  const hits = Object.values(days).filter((d) => d.status === 'hit').length

  // start scrolled to the most recent weeks on narrow screens
  useEffect(() => {
    const el = scrollRef.current
    el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <Card className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <CardLabel>Past year</CardLabel>
        <p className="text-sm text-ink-soft">
          <span className="font-bold text-ink">{hits}</span> mornings on target
        </p>
      </div>

      <div ref={ref} className="relative">
        <div ref={scrollRef} className="overflow-x-auto pb-1">
          <div
            className="inline-grid text-[10px] font-semibold text-ink-soft"
            style={{
              gridTemplateColumns: `28px repeat(${weeks.length}, ${CELL}px)`,
              gridTemplateRows: `16px repeat(5, ${CELL}px)`,
              gap: GAP,
            }}
          >
            {weeks.map((_, i) => (
              <span
                key={`m${i}`}
                className="whitespace-nowrap leading-none"
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                {monthLabel(weeks, i)}
              </span>
            ))}

            {WEEKDAY_LABELS.map((label, row) => (
              <span
                key={`d${row}`}
                className="leading-[11px]"
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
                const { date: label, detail } = describeDay(day, state.settings)
                return (
                  <div
                    key={key}
                    role="img"
                    aria-label={`${label}: ${detail}`}
                    onMouseEnter={(e) => show(e, { date: label, detail })}
                    onMouseLeave={hide}
                    className={`rounded-[3px] ${dayFill(day, state.settings)} ${
                      day.status === 'pending' ? 'ring-1 ring-sun-500 ring-inset' : ''
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

      <DayLegend />
    </Card>
  )
}
