import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
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

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dayClasses(day, settings) {
  if (day?.status === 'pending') return 'text-ink ring-2 ring-sun-500 ring-inset'
  const fill = dayFill(day, settings)
  return fill ? `${fill} text-ink` : 'text-ink-soft'
}

export function MonthCalendar({ state, onSelectDay, today = new Date() }) {
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
            const isToday = key === toDateKey(end)
            const editable = !isWeekend(date) && date <= end
            const classes = `grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums ${
              editable ? dayClasses(day, state.settings) : 'text-ink-soft/30'
            } ${isToday && day?.status !== 'pending' ? 'ring-2 ring-sun-600 ring-offset-2 ring-offset-white' : ''}`

            let cell = <span className={classes}>{date.getDate()}</span>
            if (editable) {
              const described = describeDay(
                day ?? { date: key, status: 'empty', time: null },
                state.settings,
              )
              cell = (
                <button
                  type="button"
                  aria-label={`${described.date}: ${described.detail}. Edit log on time`}
                  onClick={() => {
                    hide()
                    onSelectDay(key)
                  }}
                  onMouseEnter={(e) => show(e, described)}
                  onMouseLeave={hide}
                  className={`${classes} cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-500`}
                >
                  {date.getDate()}
                </button>
              )
            }

            return (
              <div
                key={key}
                className="grid place-items-center"
                style={i === 0 ? { gridColumnStart: getDay(date) + 1 } : undefined}
              >
                {cell}
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
