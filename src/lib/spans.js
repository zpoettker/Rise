import { differenceInMinutes, parseISO } from 'date-fns'
import { dayOf, toDateKey } from './logins'

// Workouts and work sessions are spans: { id, start, end } in local time
// ('yyyy-MM-ddTHH:mm'). A span belongs to the day it starts on, using the same
// day start as mornings (a 1 AM session still counts for the night before).

export const spanMinutes = (span) => differenceInMinutes(parseISO(span.end), parseISO(span.start))

export const spanDay = (span, settings) => toDateKey(dayOf(parseISO(span.start), settings))

// { 'yyyy-MM-dd': { count, minutes } } for finished spans
export function totalsByDay(spans, settings) {
  const totals = {}
  for (const span of spans) {
    if (!span.end) continue
    const day = (totals[spanDay(span, settings)] ??= { count: 0, minutes: 0 })
    day.count += 1
    day.minutes += spanMinutes(span)
  }
  return totals
}

// The earliest day with a span, or null
export function firstDay(totals) {
  const keys = Object.keys(totals).sort()
  return keys.length ? parseISO(keys[0]) : null
}
