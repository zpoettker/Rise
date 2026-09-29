import { Card, CardLabel } from '../ui/Card'
import { HIT_FILLS, MISS_FILL } from './days'

const SIZE = 148
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function HitRateCard({ stats, rangeLabel }) {
  const percent = stats.hitRate == null ? null : Math.round(stats.hitRate * 100)

  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <CardLabel>Hit rate</CardLabel>
        <p className="text-sm text-ink-soft">{rangeLabel}</p>
      </div>

      <div className="flex flex-1 items-center justify-center py-6">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--color-empty)"
              strokeWidth={STROKE}
            />
            {percent > 0 && (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="var(--color-sun-400)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-4xl font-semibold tabular-nums">
                {percent == null ? '–' : `${percent}%`}
              </p>
              <p className="text-xs font-semibold text-ink-soft">
                {stats.hits} of {stats.trackedDays} mornings
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-t border-line pt-4 text-sm text-ink-soft">
        <Count fill={HIT_FILLS[3]} value={stats.hits} label="hit" />
        <Count fill={MISS_FILL} value={stats.late} label="late" />
        <Count fill={MISS_FILL} value={stats.missed} label="missed" />
      </div>
    </Card>
  )
}

function Count({ fill, value, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${fill}`} />
      <span className="font-bold text-ink">{value}</span> {label}
    </span>
  )
}
