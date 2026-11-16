// Line icons for the trackers, in the same style as GearIcon (24px grid,
// currentColor stroke). Sun and laptop are Lucide icons (ISC license); the
// dumbbell is drawn flat with plates, like the Strong app's.

function Icon({ className = '', strokeWidth = 2, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function SunIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </Icon>
  )
}

export function DumbbellIcon(props) {
  return (
    <Icon {...props}>
      <rect x="2" y="9" width="3" height="6" rx="1" />
      <rect x="5" y="6" width="3" height="12" rx="1" />
      <rect x="16" y="6" width="3" height="12" rx="1" />
      <rect x="19" y="9" width="3" height="6" rx="1" />
      <path d="M8 12h8" />
    </Icon>
  )
}

export function LaptopIcon(props) {
  return (
    <Icon {...props}>
      <path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z" />
      <path d="M20.054 15.987H3.946" />
    </Icon>
  )
}

export const TRACKER_ICONS = { morning: SunIcon, workout: DumbbellIcon, work: LaptopIcon }
