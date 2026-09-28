import { HIT_FILLS } from './days'

export function DayLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
      Missed
      <span className="flex gap-[3px]">
        <span className="size-2.5 rounded-[3px] bg-empty" />
        {HIT_FILLS.slice(1).map((fill) => (
          <span key={fill} className={`size-2.5 rounded-[3px] ${fill}`} />
        ))}
      </span>
      Earlier
    </div>
  )
}
