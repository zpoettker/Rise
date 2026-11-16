import { Card, CardLabel } from '../ui/Card'
import { HIT_FILLS, MISS_FILL } from './days'

const SIZE = 148
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const COUNT_FILLS = { hit: HIT_FILLS[3], light: HIT_FILLS[1], miss: MISS_FILL }

// `rate` comes from a tracker's summary: { label, value (0–1 or null), caption, counts }
export function HitRateCard({ rate, rangeLabel }) {
  const percent = rate.value == null ? null : Math.round(rate.value * 100)

  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <CardLabel>{rate.label}</CardLabel>
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
                stroke="var(--color-accent-400)"
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
                {rate.caption}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-t border-line pt-4 text-sm text-ink-soft">
        {rate.counts.map(({ kind, value, label }) => (
          <Count key={label} fill={COUNT_FILLS[kind]} value={value} label={label} />
        ))}
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
