import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getISODay,
  isSameMonth,
  isWeekend,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { useState } from 'react'
import { toDateKey } from '../../lib/logins'
import { trackingStart } from '../../lib/stats'
import { Card, CardLabel } from '../ui/Card'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { ChartTooltip } from './ChartTooltip'
import { dayFill, daysByDate, describeDay } from './days'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function dayClasses(day, settings) {
  if (!day) return 'text-ink-soft/50'
  if (day.status === 'pending') return 'text-ink ring-2 ring-sun-500 ring-inset'
  const text = day.status === 'missed' ? 'text-white' : 'text-ink'
  return `${dayFill(day, settings)} ${text}`
}

export function MonthCalendar({ state, today = new Date() }) {
  const [month, setMonth] = useState(() => startOfMonth(today))
  const { ref, tip, show, hide } = useHoverTooltip()

  const end = startOfDay(today)
  const start = trackingStart(state)
  const days = daysByDate(state, month, today)
  const monthDays = eachDayOfInterval({ start: month, end: endOfMonth(month) })
  const tracked = Object.values(days).filter((d) => d.date.startsWith(format(month, 'yyyy-MM')))
  const count = (status) => tracked.filter((d) => d.status === status).length

  const canGoBack = start && month > startOfMonth(start)
  const canGoForward = !isSameMonth(month, today)

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <CardLabel>Calendar</CardLabel>
          <h2 className="mt-1 text-2xl font-semibold">{format(month, 'MMMM yyyy')}</h2>
        </div>
        <div className="flex gap-1">
          <NavButton
            label="Previous month"
            disabled={!canGoBack}
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            ‹
          </NavButton>
          <NavButton
            label="Next month"
            disabled={!canGoForward}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            ›
          </NavButton>
        </div>
      </div>

      <div ref={ref} className="relative">
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="pb-1 text-xs font-bold text-ink-soft">
              {d}
            </span>
          ))}

          {monthDays.map((date, i) => {
            const key = toDateKey(date)
            const day = days[key]
            const weekend = isWeekend(date)
            const isToday = key === toDateKey(end)
            const described = day && describeDay(day, state.settings)

            return (
              <div
                key={key}
                className="grid place-items-center"
                style={i === 0 ? { gridColumnStart: getISODay(date) } : undefined}
              >
                <span
                  role={described ? 'img' : undefined}
                  aria-label={described ? `${described.date}: ${described.detail}` : undefined}
                  onMouseEnter={described ? (e) => show(e, described) : undefined}
                  onMouseLeave={described ? hide : undefined}
                  className={`grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums ${
                    weekend ? 'text-ink-soft/30' : dayClasses(day, state.settings)
                  } ${isToday && day?.status !== 'pending' ? 'ring-2 ring-sun-600 ring-offset-2 ring-offset-white' : ''}`}
                >
                  {date.getDate()}
                </span>
              </div>
            )
          })}
        </div>
        <ChartTooltip tip={tip} />
      </div>

      <div className="flex gap-4 border-t border-line pt-4 text-sm text-ink-soft">
        <span>
          <span className="font-bold text-ink">{count('hit')}</span> hit
        </span>
        <span>
          <span className="font-bold text-ink">{count('late')}</span> late
        </span>
        <span>
          <span className="font-bold text-ink">{count('missed')}</span> missed
        </span>
      </div>
    </Card>
  )
}

function NavButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center rounded-full text-xl text-ink-soft transition-colors hover:bg-sun-100 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  )
}
