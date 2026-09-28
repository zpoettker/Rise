import { format, parseISO } from 'date-fns'
import { formatTime12, getDays, hitLevel, toMinutes } from '../../lib/stats'

export const HIT_FILLS = [null, 'bg-sun-200', 'bg-sun-300', 'bg-sun-400', 'bg-sun-500']

// Only hits are colored; late, missed and untracked days stay blank.
export function hitFill(day, settings) {
  return day?.status === 'hit' ? HIT_FILLS[hitLevel(day.time, settings)] : null
}

// Tracked days from `from` through today, keyed by 'yyyy-MM-dd'
export function daysByDate(state, from, today) {
  return Object.fromEntries(getDays(state, from, today).map((d) => [d.date, d]))
}

export function describeDay(day, settings) {
  const date = format(parseISO(day.date), 'EEE, MMM d')
  if (!day.time) {
    const detail = { missed: 'Missed', pending: 'Not logged on yet' }[day.status] ?? 'No data'
    return { date, detail }
  }

  const diff = toMinutes(settings.targetTime) - toMinutes(day.time)
  let when
  if (diff > 0) when = `${diff} min early`
  else if (diff === 0) when = 'right on time'
  else if (day.status === 'hit') when = `${-diff} min past target, within grace`
  else when = `${-diff} min late`
  return { date, detail: `${formatTime12(day.time)} · ${when}` }
}
