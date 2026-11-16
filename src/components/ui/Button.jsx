const VARIANTS = {
  primary:
    'bg-gradient-to-b from-accent-400 to-accent-500 text-white shadow-soft hover:from-accent-500 hover:to-accent-600',
  ghost: 'text-ink-soft hover:bg-accent-100 hover:text-ink',
  outline: 'border border-line bg-white/60 text-ink hover:border-accent-300 hover:bg-accent-50',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
