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

// The All tab: three rings, one per tracker
export function RingsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 2a10 10 0 1 1-8.66 5" />
      <path d="M12 6a6 6 0 1 1-5.2 3" />
      <path d="M12 10a2 2 0 1 1-1.73 1" />
    </Icon>
  )
}

// Icons to pick from for the custom tracker (Lucide, ISC license)
function StarIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
    </Icon>
  )
}
function BookIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
      <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
    </Icon>
  )
}
function HeartIcon(props) {
  return (
    <Icon {...props}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
    </Icon>
  )
}
function DropIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </Icon>
  )
}
function LeafIcon(props) {
  return (
    <Icon {...props}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </Icon>
  )
}
function MusicIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Icon>
  )
}
function PencilLineIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Icon>
  )
}
function MoonIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </Icon>
  )
}

export const CUSTOM_ICONS = {
  star: StarIcon,
  book: BookIcon,
  heart: HeartIcon,
  drop: DropIcon,
  leaf: LeafIcon,
  music: MusicIcon,
  pencil: PencilLineIcon,
  moon: MoonIcon,
}

export const TRACKER_ICONS = { morning: SunIcon, workout: DumbbellIcon, work: LaptopIcon }

// A tracker's icon by id; the custom tracker uses the icon picked for it
// (`custom` = settings.custom)
export function TrackerIcon({ id, custom, ...props }) {
  const Icon = id === 'custom' ? (CUSTOM_ICONS[custom?.icon] ?? StarIcon) : TRACKER_ICONS[id]
  return <Icon {...props} />
}
