import { useEffect, useRef } from 'react'

// Modal popup: opens on mount, closes on Esc or a click on the backdrop.
export function Dialog({ onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current.open) ref.current.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(24rem,calc(100%-2rem))] animate-rise rounded-3xl border border-line bg-cream p-0 text-ink shadow-soft backdrop:bg-ink/25 backdrop:backdrop-blur-sm"
    >
      {children}
    </dialog>
  )
}

export function DialogTitle({ label, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{label}</p>
      <h2 className="mt-1 text-2xl font-semibold">{children}</h2>
    </div>
  )
}
