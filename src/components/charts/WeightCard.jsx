import { endOfDay, format, startOfDay } from 'date-fns'
import { useState } from 'react'
import { useWidth } from '../../hooks/useWidth'
import { rangeStart } from '../../lib/stats'
import { formatWeight, getWeightSummary, toUnit } from '../../lib/weights'
import { Button } from '../ui/Button'
import { Card, CardLabel } from '../ui/Card'
import { ChartTooltip } from './ChartTooltip'

const HEIGHT = 230
const PAD = { top: 12, right: 48, bottom: 28, left: 4 }
const X_LABELS = 5
const STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 50]

// Weight over the selected range: a line joining each weigh-in to the next,
// a dot on each one, and an optional goal line. Clicking a weigh-in edits it.
export function WeightCard({ state, range, rangeLabel, today, onAdd, onEdit, onGoal }) {
  const { weightUnit: unit, weightGoalKg: goalKg } = state.settings
  const summary = getWeightSummary(state, range, today)
  const { points, latest, change } = summary
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)

  const show = (kg) => toUnit(kg, unit)
  // from the latest weigh-in, so it matches the big number
  const toGoal = latest && goalKg != null ? show(latest.kg) - show(goalKg) : null

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <CardLabel>Weight</CardLabel>
            <span className="text-sm text-ink-soft">{rangeLabel}</span>
          </div>
          {latest ? (
            <p className="mt-2 font-display text-5xl font-semibold tabular-nums">
              {show(latest.kg).toFixed(1)}
              <span className="ml-1.5 font-sans text-lg font-bold text-ink-soft">{unit}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">No weigh-ins yet</p>
          )}
          {latest && (
            <p className="mt-1 text-sm text-ink-soft">
              {change != null && (
                <span className="font-bold text-ink">
                  {change < 0 ? '↓' : change > 0 ? '↑' : ''} {Math.abs(show(change)).toFixed(1)} {unit}
                </span>
              )}
              {change != null && ` in ${summary.days} ${summary.days === 1 ? 'day' : 'days'}`}
              {toGoal != null && (
                <>
                  {change != null && ' · '}
                  {Math.abs(toGoal) < 0.05 ? (
                    <span className="font-bold text-accent-700">At your goal</span>
                  ) : (
                    `${Math.abs(toGoal).toFixed(1)} ${unit} to goal`
                  )}
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onGoal} className="px-4">
            {goalKg != null ? `Goal ${show(goalKg).toFixed(1)} ${unit}` : 'Set goal'}
          </Button>
          <Button onClick={onAdd} className="px-4">
            + Add weigh-in
          </Button>
        </div>
      </div>

      <div ref={ref} className="relative" style={{ height: HEIGHT }}>
        {points.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-ink-soft">
            Add a weigh-in to start your chart
          </p>
        ) : (
          width > 0 && (
            <Chart
              points={points}
              unit={unit}
              goalKg={goalKg}
              width={width}
              from={rangeStart(range, startOfDay(points[0].date), today)}
              today={today}
              hover={hover}
              onHover={setHover}
              onEdit={onEdit}
            />
          )
        )}
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="relative flex w-5 items-center justify-center">
            <span className="h-0.5 w-full rounded-full bg-accent-500" />
            <span className="absolute size-2 rounded-full bg-accent-500 ring-2 ring-white" />
          </span>
          Weigh-ins
        </span>
        {goalKg != null && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-accent-400" /> Goal
          </span>
        )}
      </p>
    </Card>
  )
}

function Chart({ points, unit, goalKg, width, from, today, hover, onHover, onEdit }) {
  const show = (kg) => toUnit(kg, unit)
  const values = points.map((p) => show(p.kg))
  if (goalKg != null) values.push(show(goalKg))

  // y: a little room above and below, on round numbers
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(1, (max - min) * 0.15)
  const step = STEPS.find((s) => (max - min + 2 * pad) / s <= 5) ?? 100
  const lo = Math.floor((min - pad) / step) * step
  const hi = Math.ceil((max + pad) / step) * step
  const ticks = []
  for (let t = lo; t <= hi + 1e-9; t += step) ticks.push(t)

  // x: the whole range, through the end of today
  const start = Math.min(startOfDay(from).getTime(), points[0].date.getTime())
  const end = endOfDay(today).getTime()
  const plotW = width - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const x = (date) => PAD.left + ((date.getTime() - start) / (end - start)) * plotW
  const y = (value) => PAD.top + (1 - (value - lo) / (hi - lo)) * plotH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date)},${y(show(p.kg))}`).join(' ')
  const area = `${line} L${x(points.at(-1).date)},${PAD.top + plotH} L${x(points[0].date)},${PAD.top + plotH} Z`
  const labelDates = Array.from({ length: X_LABELS }, (_, i) => new Date(start + ((end - start) * i) / (X_LABELS - 1)))

  const nearest = (event) => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    let best = null
    for (const p of points) {
      const d = Math.abs(x(p.date) - px)
      if (!best || d < best.d) best = { p, d }
    }
    return best?.p ?? null
  }

  // with lots of weigh-ins packed in, smaller dots keep the line readable
  const crowded = plotW / points.length < 8
  const hovered = hover && points.find((p) => p.id === hover)
  const tip = hovered && {
    x: x(hovered.date),
    y: y(show(hovered.kg)),
    content: {
      date: format(hovered.date, 'EEE, MMM d · h:mm a'),
      detail: formatWeight(hovered.kg, unit),
    },
  }

  return (
    <>
      <svg
        width={width}
        height={HEIGHT}
        className="block cursor-pointer select-none"
        role="img"
        aria-label={`Weight chart, ${points.length} weigh-ins`}
        onMouseMove={(e) => onHover(nearest(e)?.id ?? null)}
        onMouseLeave={() => onHover(null)}
        onClick={(e) => {
          const p = nearest(e)
          if (p) onEdit(p)
        }}
      >
        <defs>
          <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-200)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-accent-200)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--color-line)" />
            <text
              x={width - PAD.right + 10}
              y={y(t)}
              dy="0.35em"
              className="fill-ink-soft text-xs tabular-nums"
            >
              {Number.isInteger(step) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}

        {labelDates.map((date, i) => (
          <text
            key={i}
            x={PAD.left + (plotW * i) / (X_LABELS - 1)}
            y={HEIGHT - 6}
            textAnchor={i === 0 ? 'start' : i === X_LABELS - 1 ? 'end' : 'middle'}
            className="fill-ink-soft text-xs"
          >
            {format(date, 'MMM d')}
          </text>
        ))}

        {goalKg != null && (
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(show(goalKg))}
            y2={y(show(goalKg))}
            stroke="var(--color-accent-400)"
            strokeWidth={2}
            strokeDasharray="6 5"
          />
        )}

        {points.length > 1 && (
          <>
            <path d={area} fill="url(#weight-area)" />
            <path
              d={line}
              fill="none"
              stroke="var(--color-accent-500)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {hovered && (
          <line
            x1={x(hovered.date)}
            x2={x(hovered.date)}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--color-accent-300)"
            strokeDasharray="3 4"
          />
        )}

        {points.map((p) => (
          <circle
            key={p.id}
            cx={x(p.date)}
            cy={y(show(p.kg))}
            r={p.id === hover ? 5.5 : crowded ? 2 : 3.5}
            fill={p.id === hover ? 'var(--color-accent-600)' : 'var(--color-accent-500)'}
            stroke="white"
            strokeWidth={p.id === hover ? 2 : crowded ? 0 : 1.5}
          />
        ))}
      </svg>
      <ChartTooltip tip={tip} />
    </>
  )
}
