import { HEATMAP_MISS_FILL, HIT_FILLS } from './days'

export function DayLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ink-soft">
      <span className="flex items-center gap-1.5">
        <span className={`size-2.5 rounded-[3px] ${HEATMAP_MISS_FILL}`} />
        Late / missed
      </span>
      <span className="flex items-center gap-1.5">
        Later
        <span className="flex gap-[3px]">
          {HIT_FILLS.slice(1).map((fill) => (
            <span key={fill} className={`size-2.5 rounded-[3px] ${fill}`} />
          ))}
        </span>
        Earlier
      </span>
    </div>
  )
}
