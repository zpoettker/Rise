// Pill-shaped radio group. Options are { value, label }, plus optionally
// `icon` (shown instead of the label, which becomes its accessible name and
// tooltip).
export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full border border-line bg-white/60 p-1"
    >
      {options.map((option) => {
        const selected = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={Icon ? option.label : undefined}
            title={Icon ? option.label : undefined}
            onClick={() => onChange(option.value)}
            className={`flex items-center rounded-full py-1.5 text-sm font-bold transition-colors ${
              Icon ? 'px-3' : 'px-3.5'
            } ${
              selected
                ? 'bg-accent-400 text-white shadow-soft'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {Icon ? <Icon className="size-5" /> : option.label}
          </button>
        )
      })}
    </div>
  )
}
