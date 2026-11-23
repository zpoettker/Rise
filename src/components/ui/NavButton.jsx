// Round ‹ › button for paging through months or weeks
export function NavButton({ label, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center rounded-full text-xl text-ink-soft transition-colors hover:bg-accent-100 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  )
}
