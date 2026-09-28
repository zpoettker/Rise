export function SegmentedControl({ options, value, onChange, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full border border-line bg-white/60 p-1"
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${
              selected ? 'bg-sun-400 text-white shadow-soft' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
