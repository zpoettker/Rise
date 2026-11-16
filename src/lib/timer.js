import { addDays, addMinutes, format, startOfDay, startOfMinute } from 'date-fns'
import { dayOf } from './logins'

// The work timer. While it runs, only `state.timer` changes; finished time is
// saved to `state.workSessions` as normal { id, start, end } spans whenever
// it pauses, stops or (in timer mode) runs out. That keeps every saved session
// complete, so stats and backups never see a half-finished one.
//
// state.timer = null (idle) or {
//   mode: 'stopwatch' | 'timer',
//   durationMs: number | null,  // timer mode only
//   startedAt: number | null,   // ms; null while paused or done
//   elapsedBefore: number,      // ms from earlier stretches of this run
//   done: boolean,              // timer mode ran out
// }

const stamp = (date) => format(date, "yyyy-MM-dd'T'HH:mm")
export const MINUTE = 60 * 1000

export function timerElapsed(timer, now = Date.now()) {
  if (!timer) return 0
  return timer.elapsedBefore + (timer.startedAt ? now - timer.startedAt : 0)
}

// Milliseconds left in timer mode (never below 0), or null for the stopwatch
export function timerRemaining(timer, now = Date.now()) {
  if (!timer?.durationMs) return null
  return Math.max(0, timer.durationMs - timerElapsed(timer, now))
}

// The next day start (e.g. 4 AM) after `date`: where a session gets split
function nextDayStart(date, settings) {
  const [h, m] = settings.dayStart.split(':').map(Number)
  return addMinutes(startOfDay(addDays(dayOf(date, settings), 1)), h * 60 + m)
}

// Saves the stretch from `startMs` to `endMs` as sessions, rounded to whole
// minutes and split at day starts. Under half a minute saves nothing.
export function saveStretch(state, startMs, endMs) {
  const minutes = Math.round((endMs - startMs) / MINUTE)
  if (minutes < 1) return state

  const sessions = []
  let start = startOfMinute(new Date(startMs))
  const end = addMinutes(start, minutes)
  while (start < end) {
    const boundary = nextDayStart(start, state.settings)
    const pieceEnd = boundary < end ? boundary : end
    sessions.push({
      id: `t${startMs}-${sessions.length}`,
      start: stamp(start),
      end: stamp(pieceEnd),
    })
    start = pieceEnd
  }
  return { ...state, workSessions: [...state.workSessions, ...sessions] }
}

export function startTimer(state, mode, durationMinutes = null, now = Date.now()) {
  return {
    ...state,
    timer: {
      mode,
      durationMs: mode === 'timer' ? durationMinutes * MINUTE : null,
      startedAt: now,
      elapsedBefore: 0,
      done: false,
    },
  }
}

export function pauseTimer(state, now = Date.now()) {
  const { timer } = state
  if (!timer?.startedAt) return state
  const saved = saveStretch(state, timer.startedAt, now)
  return { ...saved, timer: { ...timer, startedAt: null, elapsedBefore: timerElapsed(timer, now) } }
}

export function resumeTimer(state, now = Date.now()) {
  if (!state.timer || state.timer.startedAt || state.timer.done) return state
  return { ...state, timer: { ...state.timer, startedAt: now } }
}

// Saves whatever is running and clears the timer
export function stopTimer(state, now = Date.now()) {
  const paused = pauseTimer(state, now)
  return { ...paused, timer: null }
}

// Timer mode: once the time is up, save up to the exact end and mark it done.
// Runs on every tick and on load, so a timer that ran out while the tab was
// closed is still logged correctly.
export function settleTimer(state, now = Date.now()) {
  const { timer } = state
  if (!timer?.startedAt || !timer.durationMs) return state
  if (timerElapsed(timer, now) < timer.durationMs) return state
  const end = timer.startedAt + (timer.durationMs - timer.elapsedBefore)
  const saved = saveStretch(state, timer.startedAt, end)
  return {
    ...saved,
    timer: { ...timer, startedAt: null, elapsedBefore: timer.durationMs, done: true },
  }
}

export const dismissTimer = (state) => ({ ...state, timer: null })

// 1:04:09, or 4:09 under an hour
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
