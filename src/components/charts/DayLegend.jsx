import { HIT_FILLS } from './days'

export function DayLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-soft">
      <span className="flex items-center gap-1.5">
        Hit
        <span className="flex gap-[3px]">
          {HIT_FILLS.slice(1).map((fill) => (
            <span key={fill} className={`size-2.5 rounded-[3px] ${fill}`} />
          ))}
        </span>
        earlier
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-late" />
        Late
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-missed" />
        Missed
      </span>
    </div>
  )
}
