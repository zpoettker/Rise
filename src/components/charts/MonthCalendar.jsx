import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { useState } from 'react'
import { toDateKey } from '../../lib/logins'
import { daysByDate } from '../../lib/trackers'
import { Card, CardLabel } from '../ui/Card'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { ChartTooltip } from './ChartTooltip'
import { dayFill } from './days'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // Sunday first, like getDay

function dayClasses(day) {
  if (day?.status === 'pending') return 'text-ink ring-2 ring-accent-500 ring-inset'
  const fill = dayFill(day)
  if (!fill) return 'text-ink-soft'
  return `${fill} ${day.level === 5 ? 'text-white' : 'text-ink'}`
}

// `onSelectDay` makes tracked days clickable (to edit them); without it the
// days only show their tooltip.
export function MonthCalendar({ tracker, state, onSelectDay, today = new Date() }) {
  const [month, setMonth] = useState(() => startOfMonth(today))
  const { ref, tip, show, hide } = useHoverTooltip()

  const end = startOfDay(today)
  const start = tracker.start(state)
  const days = daysByDate(tracker, state, month, today)
  const monthDays = eachDayOfInterval({ start: month, end: endOfMonth(month) })
  const tracked = Object.values(days).filter((d) => d.date.startsWith(format(month, 'yyyy-MM')))

  // the tracker picks the first column: Sunday (0, default) or Monday (1)
  const weekStart = tracker.weekStartsOn ?? 0
  const weekdays = [...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)]
  const column = (date) => ((getDay(date) - weekStart + 7) % 7) + 1

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
          {weekdays.map((d, i) => (
            <span key={i} className="pb-1 text-xs font-bold text-ink-soft">
              {d}
            </span>
          ))}

          {monthDays.map((date, i) => {
            const key = toDateKey(date)
            const day = days[key]
            const isToday = key === toDateKey(end)
            const trackedDay = tracker.isTracked(date, state.settings) && date <= end
            const classes = `grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums ${
              trackedDay ? dayClasses(day) : 'text-ink-soft/30'
            } ${isToday && day?.status !== 'pending' ? 'ring-2 ring-accent-600 ring-offset-2 ring-offset-white' : ''}`

            let cell = <span className={classes}>{date.getDate()}</span>
            const described =
              trackedDay &&
              tracker.describe(day ?? { date: key, status: 'empty', minutes: 0 }, state.settings)
            if (trackedDay && !onSelectDay) {
              cell = (
                <span
                  role="img"
                  className={classes}
                  aria-label={`${described.date}: ${described.detail}`}
                  onMouseEnter={(e) => show(e, described)}
                  onMouseLeave={hide}
                >
                  {date.getDate()}
                </span>
              )
            } else if (trackedDay) {
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
                  className={`${classes} cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500`}
                >
                  {date.getDate()}
                </button>
              )
            }

            return (
              <div
                key={key}
                className="grid place-items-center"
                style={i === 0 ? { gridColumnStart: column(date) } : undefined}
              >
                <span className="relative">
                  {cell}
                  {tracker.marksGoal && trackedDay && day?.status === 'hit' && <GoalDot />}
                </span>
              </div>
            )
          })}
        </div>
        <ChartTooltip tip={tip} />
      </div>

      <div className="flex gap-4 border-t border-line pt-4 text-sm text-ink-soft">
        {tracker.monthCounts(tracked).map(({ value, label, marker }) => (
          <span key={label} className="flex items-center gap-1.5">
            {marker && <span className="size-2 rounded-full bg-accent-700" />}
            <span>
              <span className="font-bold text-ink">{value}</span> {label}
            </span>
          </span>
        ))}
      </div>
    </Card>
  )
}

function NavButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center rounded-full text-xl text-ink-soft transition-colors hover:bg-accent-100 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  )
}

// Badge on a day that met its goal (trackers whose shading isn't the goal)
function GoalDot() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent-700 ring-2 ring-white"
    />
  )
}
