import { useLayoutEffect, useRef } from 'react'

// Pill-shaped radio group. Options are { value, label }, plus optionally
// `icon` (shown instead of the label, which becomes its accessible name and
// tooltip).
//
// The coloured pill slides from option to option. Besides clicking, you can
// press and slide across the options: whichever one is under the pointer is
// picked as you pass over it.
export function SegmentedControl({ options, value, onChange, label }) {
  const groupRef = useRef(null)
  const pillRef = useRef(null)
  const dragging = useRef(false)

  // move the pill onto the selected option (and keep it there if the
  // options change size, e.g. once the font loads). Written straight to the
  // DOM so it can glide with a CSS transition.
  useLayoutEffect(() => {
    const group = groupRef.current
    const pill = pillRef.current
    const place = () => {
      const button = group.querySelector('[aria-checked="true"]')
      if (!button) return
      pill.style.left = `${button.offsetLeft}px`
      pill.style.width = `${button.offsetWidth}px`
    }
    place()
    // no glide on the very first placement
    const raf = requestAnimationFrame(() => pill.classList.add('transition-all'))
    const observer = new ResizeObserver(place)
    observer.observe(group)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [value])

  // the option under the pointer's x position, if any
  const optionAt = (x) => {
    const buttons = [...groupRef.current.querySelectorAll('[role="radio"]')]
    const hit = buttons.find((b) => {
      const r = b.getBoundingClientRect()
      return x >= r.left && x <= r.right
    })
    return hit && options[buttons.indexOf(hit)]
  }

  const pick = (x) => {
    const option = optionAt(x)
    if (option && option.value !== value) onChange(option.value)
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && pick(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      className="relative inline-flex touch-pan-y rounded-full border border-line bg-white/60 p-1 select-none"
    >
      <span
        ref={pillRef}
        aria-hidden="true"
        className="absolute inset-y-1 rounded-full bg-accent-400 shadow-soft duration-300 ease-[cubic-bezier(0.3,1.2,0.5,1)]"
      />
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
            className={`relative flex items-center rounded-full py-1.5 text-sm font-bold transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
              Icon ? 'px-3' : 'px-3.5'
            } ${selected ? 'text-white' : 'text-ink-soft hover:text-ink'}`}
          >
            {Icon ? <Icon className="size-5" /> : option.label}
          </button>
        )
      })}
    </div>
  )
}
