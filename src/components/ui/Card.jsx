export function Card({ className = '', children, ...props }) {
  return (
    <section
      className={`rounded-3xl border border-line bg-white/70 p-6 shadow-soft backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </section>
  )
}

export function CardLabel({ children }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
      {children}
    </p>
  )
}
