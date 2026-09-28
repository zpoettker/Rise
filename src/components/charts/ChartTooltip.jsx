export function ChartTooltip({ tip }) {
  if (!tip) return null
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-xs shadow-soft"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="font-bold text-white">{tip.content.date}</p>
      <p className="text-sun-100">{tip.content.detail}</p>
    </div>
  )
}
