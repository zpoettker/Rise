import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { useHoverTooltip } from '../../hooks/useHoverTooltip'
import { useWidth } from '../../hooks/useWidth'
import { formatDuration } from '../../lib/stats'
import { Card, CardLabel } from '../ui/Card'
import { ChartTooltip } from './ChartTooltip'

const MAX_HEIGHT = 240
const MAX_BRICK = 64
// a little texture: neighbouring bricks pick slightly different greens
const SHADES = ['bg-accent-500', 'bg-accent-400', 'bg-accent-600', 'bg-accent-400', 'bg-accent-500']
const longDate = (key) => format(parseISO(key), 'MMM d, yyyy')
// While the designs are being worked on, locked castles can be opened to see
// them built. Set to false to keep them hidden until they're reached.
const PREVIEW_LOCKED = true

// Castle builder: one brick for every day the goal is met, filling the faint
// outline from the bottom up in a running bond. The mini castles in the corner
// are tabs: every castle built so far, the one under construction, then the
// ones still to come (locked).
// `castle` comes from getCastleProgress.
export function CastleCard({ castle }) {
  const { current, completed, justFinished } = castle
  // a locked castle opens as a finished preview (no dates)
  const locked = castle.locked.map((c) => ({
    ...c,
    locked: true,
    laid: c.bricks.length,
    dates: [],
  }))
  const tabs = [...completed, current, ...locked]
  const [picked, setPicked] = useState(null)
  const shown = tabs.find((t) => t.n === picked) ?? current
  const building = shown === current && !justFinished
  const unlocksAfter = (c) => tabs.find((t) => t.n === c.n - 1)?.name

  const total = shown.bricks.length
  const left = total - shown.laid

  let status
  if (shown.locked) status = `Locked · unlocks when ${unlocksAfter(shown)} is finished`
  else if (!building) status = `Built ${longDate(shown.dates[0])} – ${longDate(shown.dates.at(-1))}`
  else if (castle.todayMet) status = "Today's brick is laid."
  else if (castle.todayTracked)
    status = `Hit today's goal to lay the next brick · ${formatDuration(castle.todayLeft)} to go`
  else status = 'Your next day on goal lays the next brick.'
  const celebrate = shown === current && justFinished

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div role="tablist" aria-label="Castles" className="flex flex-wrap items-end gap-2">
            {tabs.map((t) => {
              const selected = t === shown
              const done = !t.locked && (t !== current || justFinished)
              const openable = !t.locked || PREVIEW_LOCKED
              return (
                <button
                  key={t.n}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-disabled={!openable}
                  title={
                    t.locked
                      ? `${t.name} · locked`
                      : done
                        ? `${t.name} · finished ${longDate(t.finishedOn ?? t.dates.at(-1))}`
                        : `${t.name} · in progress`
                  }
                  onClick={() => openable && setPicked(t.n)}
                  className={`relative rounded-lg border p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
                    selected
                      ? 'border-accent-400 bg-accent-50 ring-2 ring-accent-200'
                      : t.locked
                        ? 'border-dashed border-line bg-white/40 hover:border-ink-soft/40'
                        : 'border-line bg-white/70 hover:border-accent-300'
                  } ${openable ? '' : 'cursor-default'}`}
                >
                  <MiniCastle castle={t} done={done} />
                  {t.locked && <LockBadge />}
                </button>
              )
            })}
          </div>
          <div>
            <CardLabel>
              Castle builder · {completed.length + (justFinished ? 1 : 0)} built
            </CardLabel>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              {shown.name}
              {shown.locked && (
                <span className="rounded-full bg-empty px-2.5 py-0.5 font-sans text-xs font-bold text-ink-soft">
                  Locked · preview
                </span>
              )}
            </h2>
          </div>
        </div>
        <div className="text-right">
          {building ? (
            <p className="font-display text-3xl font-semibold tabular-nums">
              {shown.laid}
              <span className="font-sans text-base font-bold text-ink-soft"> / {total} bricks</span>
            </p>
          ) : (
            <p className="font-display text-3xl font-semibold tabular-nums">
              {total}
              <span className="font-sans text-base font-bold text-ink-soft"> bricks</span>
            </p>
          )}
          <p className="text-sm text-ink-soft">
            {building
              ? '1 brick for every day on goal'
              : shown.locked
                ? 'Not started'
                : `Finished ${longDate(shown.dates.at(-1))}`}
          </p>
        </div>
      </div>

      <CastleView
        key={shown.n}
        castle={shown}
        building={building}
        newestToday={building && castle.todayMet}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
        <p
          className={
            celebrate || (building && castle.todayMet)
              ? 'font-bold text-accent-700'
              : 'text-ink-soft'
          }
        >
          {celebrate ? 'Castle complete! The next one starts with your next day on goal.' : status}
        </p>
        {building && (
          <p className="text-ink-soft">
            <span className="font-bold text-ink">{left}</span> {left === 1 ? 'brick' : 'bricks'} to
            finish
          </p>
        )}
      </div>
    </Card>
  )
}

// The big castle: laid bricks over the faint outline. Bricks are in half-brick
// units, so staggered rows line up. Remounts (and replays the drop-in) when a
// different castle is picked.
function CastleView({ castle, building, newestToday }) {
  const [ref, width] = useWidth()
  const { ref: tipRef, tip, show, hide } = useHoverTooltip()
  const cols = castle.rows[0].length
  const rowCount = castle.rows.length
  const brickW = Math.min(MAX_BRICK, width / cols, (2 * MAX_HEIGHT) / rowCount)
  const half = brickW / 2
  const brickH = brickW / 2
  const newest = newestToday ? castle.laid - 1 : -1
  const finished = castle.laid === castle.bricks.length && !castle.locked

  return (
    <div ref={ref} className="w-full">
      <div
        ref={tipRef}
        className="relative mx-auto"
        style={{ width: cols * brickW, height: rowCount * brickH + 34 }}
      >
        {finished && <Flag x={(cols * brickW) / 2} />}
        <div className="absolute inset-x-0 bottom-0" style={{ height: rowCount * brickH }}>
          {castle.bricks.map(({ row, col, span }, i) => {
            const style = {
              left: col * half + 1.5,
              top: row * brickH + 1.5,
              width: span * half - 3,
              height: brickH - 3,
            }
            if (i >= castle.laid) {
              const next = building && i === castle.laid
              return (
                <span
                  key={i}
                  style={style}
                  className={`absolute rounded-[3px] ${
                    next
                      ? 'animate-pulse border-2 border-dashed border-accent-400 bg-accent-50'
                      : 'border border-line bg-empty/40'
                  }`}
                />
              )
            }
            const delay = `${Math.min(i * 12, 1200)}ms`
            return (
              <span
                key={i}
                onMouseEnter={(e) =>
                  castle.dates[i] &&
                  show(e, {
                    date: `Brick ${i + 1}`,
                    detail: `Laid ${format(parseISO(castle.dates[i]), 'EEE, MMM d, yyyy')}`,
                  })
                }
                onMouseLeave={hide}
                style={{
                  ...style,
                  ...(i === newest
                    ? {
                        animation: `brick 0.5s ${delay} both, glow 1.6s ease-in-out infinite alternate`,
                      }
                    : { animationDelay: delay }),
                }}
                className={`absolute animate-brick rounded-[3px] shadow-[inset_0_2px_0_rgb(255_255_255/0.3),inset_0_-2px_0_rgb(0_0_0/0.1)] ${
                  SHADES[(row * 3 + col) % SHADES.length]
                }`}
              />
            )
          })}
        </div>
        <ChartTooltip tip={tip} />
      </div>
    </div>
  )
}

// A castle in miniature, for the tabs in the corner. Drawn on the simple
// grid; a castle still being built shows how far along it is, without a flag,
// and a locked one is a grey silhouette.
function MiniCastle({ castle, done }) {
  const { rows } = castle
  const cell = rows[0].length > 9 ? 3 : 4
  const w = rows[0].length * cell
  // which brick-width cells have something laid in them
  const laid = new Set()
  // a locked castle is just a grey silhouette
  castle.bricks.slice(0, castle.locked ? 0 : castle.laid).forEach(({ row, col, span }) => {
    for (let h = col; h < col + span; h++) laid.add(`${row}-${Math.floor(h / 2)}`)
  })
  return (
    <svg width={w} height={rows.length * (cell / 2) + 6} aria-hidden="true" className="block">
      {done && (
        <>
          <line x1={w / 2} x2={w / 2} y1={0} y2={6} stroke="var(--color-accent-700)" />
          <path d={`M${w / 2},0 l5,1.5 l-5,1.5 z`} fill="var(--color-accent-500)" />
        </>
      )}
      {rows.flatMap((r, y) =>
        [...r].map((c, x) =>
          c === '#' ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={6 + y * (cell / 2)}
              width={cell - 0.6}
              height={cell / 2 - 0.6}
              fill={
                done || laid.has(`${y}-${x}`) ? 'var(--color-accent-500)' : 'var(--color-empty)'
              }
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

// A pennant on top of a finished castle
function Flag({ x }) {
  return (
    <svg
      width={30}
      height={34}
      className="absolute top-0 animate-rise"
      style={{ left: x - 2 }}
      aria-hidden="true"
    >
      <line
        x1={2}
        x2={2}
        y1={2}
        y2={34}
        stroke="var(--color-accent-700)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path d="M3,3 L26,9 L3,15 Z" fill="var(--color-accent-500)" />
    </svg>
  )
}

// Padlock on a locked castle's tab
function LockBadge() {
  return (
    <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border border-line bg-cream text-ink-soft shadow-soft">
      <svg
        viewBox="0 0 16 16"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="currentColor" stroke="none" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" />
      </svg>
    </span>
  )
}
