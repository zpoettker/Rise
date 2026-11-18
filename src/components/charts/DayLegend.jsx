import { HEATMAP_MISS_FILL, HIT_FILLS } from './days'

export function DayLegend({ legend }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink-soft">
      {legend.miss && (
        <span className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-[3px] ${HEATMAP_MISS_FILL}`} />
          {legend.miss}
        </span>
      )}
      {legend.steps ? (
        legend.steps.map(({ level, label }) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-[3px] ${HIT_FILLS[level]}`} />
            {label}
          </span>
        ))
      ) : (
        <span className="flex items-center gap-1.5">
          {legend.low}
          <span className="flex gap-[3px]">
            {HIT_FILLS.slice(1, 1 + (legend.levels ?? 4)).map((fill) => (
              <span key={fill} className={`size-2.5 rounded-[3px] ${fill}`} />
            ))}
          </span>
          {legend.high}
        </span>
      )}
    </div>
  )
}
