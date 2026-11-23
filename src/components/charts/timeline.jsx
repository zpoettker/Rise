import { format, parseISO } from 'date-fns'
import { formatDuration } from '../../lib/stats'
import { timeLabel } from '../../lib/timeline'

// Shared pieces of the week timeline: the read-only card and the edit popup
// both draw the same grid of days against a time-of-day axis.

const LABEL_EVERY = 120 // minutes between hour labels
// block shade by length (blockLevel): under 30m, 30m–1h, 1–2h, 2h+
const BLOCK_FILLS = [null, 'bg-accent-200', 'bg-accent-300', 'bg-accent-500', 'bg-accent-700']
const BLOCK_HOVER = [
  null,
  'hover:bg-accent-300',
  'hover:bg-accent-400',
  'hover:bg-accent-600',
  'hover:bg-accent-800',
]
const LEGEND = ['< 30m', '30m–1h', '1–2h', '2h+']

// "9 AM", "12 PM"; minutes past 24:00 wrap to the next morning
function hourLabel(minute) {
  const h = Math.floor(minute / 60) % 24
  return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`
}

// The grid: hour labels on top, then one row per day with its blocks, the
// day's total and a goal check. Read-only rows show a tooltip on hover
// (`onHoverBlock`); while editing, rows take `onPress` (empty space) and
// blocks become draggable through `onGrab`. `focus` highlights a day.
export function TimelineGrid({
  rows,
  from,
  to,
  now,
  focus,
  trackRef,
  editing,
  selected,
  dragId,
  onPress,
  onGrab,
  onHoverBlock,
  onLeaveBlock,
}) {
  const span = to - from
  const at = (minute) => `${((minute - from) / span) * 100}%`
  const ticks = []
  for (let m = Math.ceil(from / LABEL_EVERY) * LABEL_EVERY; m <= to; m += LABEL_EVERY) ticks.push(m)

  return (
    <div>
      <div className="flex gap-3">
        <span className="w-14 shrink-0" />
        <div className="relative h-4 flex-1 text-[11px] font-semibold text-ink-soft">
          {ticks.map((m) => (
            <span
              key={m}
              className={`absolute whitespace-nowrap ${m === from ? '' : m === to ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: at(m) }}
            >
              {hourLabel(m)}
            </span>
          ))}
        </div>
        <span className="w-24 shrink-0" />
      </div>

      <div className={`mt-1 space-y-1.5 ${editing ? 'select-none' : ''}`}>
        {rows.map((day) => {
          const focused = day.date === focus
          return (
            <div
              key={day.date}
              className={`flex items-center gap-3 rounded-xl py-1 ${
                focused ? 'bg-accent-100 ring-2 ring-accent-300' : day.today ? 'bg-accent-50' : ''
              }`}
            >
              <span
                className={`w-14 shrink-0 pl-2 text-xs font-bold ${
                  focused || day.today ? 'text-accent-700' : 'text-ink-soft'
                }`}
              >
                {format(parseISO(day.date), 'EEE d')}
              </span>

              <div
                ref={trackRef ? (el) => trackRef(day.date, el) : undefined}
                onPointerDown={onPress ? (e) => onPress(e, day) : undefined}
                className={`relative h-7 flex-1 rounded-md ${day.future ? 'bg-empty/40' : 'bg-empty/70'} ${
                  editing && day.editable ? 'cursor-copy touch-none' : ''
                }`}
              >
                {ticks.map((m) => (
                  <span
                    key={m}
                    className="absolute inset-y-0 w-px bg-white/80"
                    style={{ left: at(m) }}
                  />
                ))}
                {day.blocks.map((block, i) =>
                  editing && !block.running ? (
                    <EditableBlock
                      key={block.id}
                      block={block}
                      at={at}
                      span={span}
                      selected={selected === block.id}
                      dragging={dragId === block.id}
                      onGrab={onGrab}
                    />
                  ) : (
                    <span
                      key={block.id ?? i}
                      onMouseEnter={onHoverBlock ? (e) => onHoverBlock(e, day, block) : undefined}
                      onMouseLeave={onLeaveBlock}
                      className={`absolute inset-y-0.5 min-w-1 origin-left rounded-[4px] shadow-[inset_0_2px_0_rgb(255_255_255/0.25)] transition-colors ${
                        block.running
                          ? `animate-glow ${BLOCK_FILLS[block.level]}`
                          : `animate-slide ${BLOCK_FILLS[block.level]} ${editing ? '' : BLOCK_HOVER[block.level]}`
                      }`}
                      style={{ left: at(block.start), width: `${(block.minutes / span) * 100}%` }}
                    />
                  ),
                )}
                {day.today && now != null && now >= from && now <= to && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-y-1 w-0.5 rounded-full bg-accent-700"
                    style={{ left: at(now) }}
                  />
                )}
              </div>

              <span className="flex w-24 shrink-0 items-center justify-end gap-1.5 pr-2 text-sm whitespace-nowrap tabular-nums">
                <span className={day.minutes ? 'font-bold text-ink' : 'text-ink-soft'}>
                  {day.future && !day.minutes ? '–' : formatDuration(day.minutes)}
                </span>
                {day.met && day.minutes > 0 && <GoalCheck />}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BlockLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
      <span>Block length</span>
      {LEGEND.map((label, i) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`h-3 w-5 rounded-[3px] ${BLOCK_FILLS[i + 1]}`} /> {label}
        </span>
      ))}
    </div>
  )
}

function GoalCheck() {
  return (
    <span
      className="grid size-4 place-items-center rounded-full bg-accent-700 text-white"
      aria-label="Goal met"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        aria-hidden="true"
      >
        <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

// A block while editing: grab the middle to move it, the edges to resize it.
// The selected one shows its times above it.
function EditableBlock({ block, at, span, selected, dragging, onGrab }) {
  return (
    <div
      onPointerDown={(e) => onGrab(e, block, 'move')}
      className={`group absolute inset-y-0.5 rounded-[4px] shadow-[inset_0_2px_0_rgb(255_255_255/0.25)] ${
        BLOCK_FILLS[block.level]
      } ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${
        selected ? 'z-10 ring-2 ring-accent-700 ring-offset-1 ring-offset-white' : ''
      } ${block.invalid ? 'opacity-50' : ''}`}
      style={{ left: at(block.start), width: `${(block.minutes / span) * 100}%` }}
    >
      {['left', 'right'].map((side) => (
        <span
          key={side}
          onPointerDown={(e) => onGrab(e, block, side)}
          className={`absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} grid w-2 cursor-ew-resize place-items-center`}
        >
          <span
            className={`h-3 w-0.5 rounded-full bg-white/90 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          />
        </span>
      ))}
      {selected && (
        <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-bold text-white shadow-soft">
          {timeLabel(block.start)} – {timeLabel(block.end)} · {formatDuration(block.minutes)}
          {block.invalid && ' · overlaps'}
        </span>
      )}
    </div>
  )
}

export function PencilIcon({ className = 'size-[18px]' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
