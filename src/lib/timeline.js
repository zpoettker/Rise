import { format, parseISO } from 'date-fns'

// Labels for the week timeline (card and edit popup).

// "9:05 AM"
export function timeLabel(minute) {
  const total = Math.round(minute)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// "Nov 16 – 22", "Nov 30 – Dec 6", with the year if it isn't this year
export function weekLabel(start, today) {
  const first = parseISO(start)
  const last = new Date(first)
  last.setDate(last.getDate() + 6)
  const end = format(last, last.getMonth() === first.getMonth() ? 'd' : 'MMM d')
  const year = last.getFullYear() !== today.getFullYear() ? `, ${last.getFullYear()}` : ''
  return `${format(first, 'MMM d')} – ${end}${year}`
}
