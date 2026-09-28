import { eachDayOfInterval, isWeekend, max, parseISO, startOfDay, subDays } from 'date-fns'
import { toDateKey } from './logins'

export const RANGES = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
}

export function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function formatMinutes(minutes) {
  const total = Math.round(minutes)
  const h = String(Math.floor(total / 60)).padStart(2, '0')
  const m = String(total % 60).padStart(2, '0')
  return `${h}:${m}`
}

export function formatTime12(time) {
  const [h, m] = time.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

export function isHit(time, settings) {
  return toMinutes(time) <= toMinutes(settings.targetTime) + settings.graceMinutes
}

// How strongly a hit glows on the charts: 1 (grace window / just made it) → 4 (30+ min early)
export function hitLevel(time, settings) {
  const early = toMinutes(settings.targetTime) - toMinutes(time)
  if (early >= 30) return 4
  if (early >= 15) return 3
  if (early >= 5) return 2
  return 1
}

// First day with a login; days before this are never counted as missed.
export function trackingStart(state) {
  const keys = Object.keys(state.entries).sort()
  return keys.length ? parseISO(keys[0]) : null
}

// Every weekday from `from` to `today` (clamped to the tracking start), each
// classified as 'hit' | 'late' | 'missed' | 'pending' (today, not logged yet).
export function getDays(state, from, today = new Date()) {
  const start = trackingStart(state)
  if (!start) return []

  const first = max([startOfDay(from), start])
  const last = startOfDay(today)
  if (first > last) return []

  const todayKey = toDateKey(today)

  return eachDayOfInterval({ start: first, end: last })
    .filter((day) => !isWeekend(day))
    .map((day) => {
      const date = toDateKey(day)
      const entry = state.entries[date]
      let status
      if (entry) status = isHit(entry.time, state.settings) ? 'hit' : 'late'
      else status = date === todayKey ? 'pending' : 'missed'
      return { date, status, time: entry?.time ?? null }
    })
}

export function rangeStart(range, state, today = new Date()) {
  const days = RANGES[range]
  if (days == null) return trackingStart(state) ?? startOfDay(today)
  return subDays(startOfDay(today), days - 1)
}

// Pending (today, not yet logged) never breaks a streak.
function streaks(days) {
  let best = 0
  let run = 0
  for (const { status } of days) {
    if (status === 'pending') continue
    run = status === 'hit' ? run + 1 : 0
    best = Math.max(best, run)
  }
  return { current: run, best }
}

export function getStats(state, range = '30d', today = new Date()) {
  const allDays = getDays(state, trackingStart(state) ?? today, today)
  const { current, best } = streaks(allDays)

  const days = getDays(state, rangeStart(range, state, today), today)
  const counted = days.filter((d) => d.status !== 'pending')
  const hits = counted.filter((d) => d.status === 'hit').length
  const times = days.filter((d) => d.time).map((d) => toMinutes(d.time))

  return {
    currentStreak: current,
    bestStreak: best,
    hits,
    trackedDays: counted.length,
    hitRate: counted.length ? hits / counted.length : null,
    averageTime: times.length
      ? formatMinutes(times.reduce((a, b) => a + b, 0) / times.length)
      : null,
  }
}
