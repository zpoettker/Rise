import { addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import { useState } from 'react'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { toDateKey } from '../../lib/logins'
import { formatDuration } from '../../lib/stats'
import { getWeekTimeline, workStart } from '../../lib/work'
import { Card, CardLabel } from '../ui/Card'
import { NavButton } from '../ui/NavButton'
import { ChartTooltip } from './ChartTooltip'
import { timeLabel, weekLabel } from '../../lib/timeline'
import { BlockLegend, PencilIcon, TimelineGrid } from './timeline'

// A week's work sessions on a time-of-day axis, one row per day (Mon–Sun),
// so you can see when you focus and where the day breaks up. Blocks are
// shaded by length. Arrows page back to earlier weeks (as far as the first
// session) and forward to this week. On this week, today's row is
// highlighted, its running block grows live and a line marks the time now.
// The pencil opens the week in the edit popup (`onEdit(day)`).
export function WeekTimelineCard({ state, today, now, onEdit }) {
  const [offset, setOffset] = useState(0) // weeks back from this one
  const { ref, tip, show, hide } = useHoverTooltip()
  const timeline = getWeekTimeline(state, today, now, addWeeks(today, offset))
  const first = workStart(state)
  const canGoBack = first && parseISO(timeline.start) > startOfWeek(first, { weekStartsOn: 1 })
  const sessions = timeline.days.reduce((sum, d) => sum + d.blocks.length, 0)
  // the pencil opens on today for this week, else on the week's Monday
  const editDay = offset === 0 ? toDateKey(today) : timeline.start

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardLabel>{offset === 0 ? "This week's timeline" : 'Weekly timeline'}</CardLabel>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            {weekLabel(timeline.start, today)}
            <button
              type="button"
              onClick={() => onEdit(editDay)}
              aria-label="Edit this week"
              title="Edit this week"
              className="grid size-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-accent-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <PencilIcon />
            </button>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-soft">
            <span className="font-bold text-ink">{sessions}</span>{' '}
            {sessions === 1 ? 'session' : 'sessions'}
          </p>
          {offset < 0 && (
            <button
              type="button"
              onClick={() => setOffset(0)}
              className="rounded-full px-2 text-sm font-bold text-accent-700 underline decoration-accent-300 underline-offset-4 hover:decoration-accent-500"
            >
              This week
            </button>
          )}
          <div className="flex gap-1">
            <NavButton
              label="Previous week"
              disabled={!canGoBack}
              onClick={() => setOffset((o) => o - 1)}
            >
              ‹
            </NavButton>
            <NavButton
              label="Next week"
              disabled={offset === 0}
              onClick={() => setOffset((o) => o + 1)}
            >
              ›
            </NavButton>
          </div>
        </div>
      </div>

      <div ref={ref} className="relative">
        <TimelineGrid
          rows={timeline.days}
          from={timeline.from}
          to={timeline.to}
          now={offset === 0 ? timeline.now : null}
          onHoverBlock={(e, day, block) =>
            show(e, {
              date: format(parseISO(day.date), 'EEE, MMM d'),
              detail: `${timeLabel(block.start)} – ${block.running ? 'now' : timeLabel(block.end)} · ${formatDuration(block.minutes)}`,
            })
          }
          onLeaveBlock={hide}
        />
        <ChartTooltip tip={tip} />
      </div>

      <div className="border-t border-line pt-4">
        <BlockLegend />
      </div>
    </Card>
  )
}
