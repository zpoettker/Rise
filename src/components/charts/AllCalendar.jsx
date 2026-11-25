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
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { getAllDays } from '../../lib/all'
import { toDateKey } from '../../lib/logins'
import { Card, CardLabel } from '../ui/Card'
import { NavButton } from '../ui/NavButton'
import { getTrackers } from '../../lib/trackers'
import { hitsDetail } from './allColors'
import { ChartTooltip } from './ChartTooltip'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// A month for all three trackers: three dots under each day (gold, blue,
// green) light up for the trackers that hit; a perfect day gets a dark circle.
export function AllCalendar({ state, today = new Date() }) {
  const [month, setMonth] = useState(() => startOfMonth(today))
  const { ref, tip, show, hide } = useHoverTooltip()
  const end = startOfDay(today)
  const all = getAllDays(state, month, today)
  const days = Object.fromEntries(all.map((d) => [d.date, d]))
  const monthDays = eachDayOfInterval({ start: month, end: endOfMonth(month) })
  const inMonth = all.filter((d) => d.date.startsWith(format(month, 'yyyy-MM')))
  const perfect = inMonth.filter((d) => d.perfect).length
  const firstData = getAllDays(state, new Date(0), today)[0]?.date
  const canGoBack = firstData && format(month, 'yyyy-MM') > firstData.slice(0, 7)

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
            disabled={isSameMonth(month, today)}
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            ›
          </NavButton>
        </div>
      </div>

      <div ref={ref} className="relative">
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="pb-1 text-xs font-bold text-ink-soft">
              {d}
            </span>
          ))}
          {monthDays.map((date, i) => {
            const key = toDateKey(date)
            const day = days[key]
            const future = date > end
            const isToday = key === toDateKey(end)
            const label = format(date, 'EEE, MMM d')
            const hits = hitsDetail(
              day,
              state.settings.enabledTrackers,
              getTrackers(state.settings),
            )
            const detail = day?.perfect ? `Perfect day · ${hits}` : hits
            return (
              <div
                key={key}
                className="flex flex-col items-center gap-1"
                style={i === 0 ? { gridColumnStart: ((getDay(date) + 6) % 7) + 1 } : undefined}
              >
                <span
                  role={future ? undefined : 'img'}
                  aria-label={future ? undefined : `${label}: ${detail}`}
                  onMouseEnter={future ? undefined : (e) => show(e, { date: label, detail })}
                  onMouseLeave={future ? undefined : hide}
                  className={`grid size-8 place-items-center rounded-full text-sm font-bold tabular-nums ${
                    future
                      ? 'text-ink-soft/30'
                      : day?.perfect
                        ? 'bg-stone-700 text-white'
                        : 'text-ink'
                  } ${isToday ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-white' : ''}`}
                >
                  {date.getDate()}
                </span>
                <span className="flex gap-0.5" aria-hidden="true">
                  {state.settings.enabledTrackers.map((id) => (
                    <span
                      key={id}
                      data-tracker={id}
                      className={`size-1.5 rounded-full ${
                        future ? 'bg-transparent' : day?.[id] ? 'bg-accent-400' : 'bg-empty'
                      }`}
                    />
                  ))}
                </span>
              </div>
            )
          })}
        </div>
        <ChartTooltip tip={tip} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-sm text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-stone-700" />
          <span>
            <span className="font-bold text-ink">{perfect}</span> perfect{' '}
            {perfect === 1 ? 'day' : 'days'}
          </span>
        </span>
        {state.settings.enabledTrackers.map((id) => (
          <span key={id} data-tracker={id} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent-400" />
            <span className="font-bold text-ink">{inMonth.filter((d) => d[id]).length}</span>
          </span>
        ))}
      </div>
    </Card>
  )
}
