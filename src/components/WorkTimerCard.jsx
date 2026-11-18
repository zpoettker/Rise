import { useEffect, useRef, useState } from 'react'
import { useNow } from '../hooks/useNow'
import { dayOf, toDateKey } from '../lib/logins'
import { spanDay, spanMinutes } from '../lib/spans'
import { formatDuration } from '../lib/stats'
import { goalOn, setWorkGoal } from '../lib/work'
import {
  dismissTimer,
  formatClock,
  MINUTE,
  pauseTimer,
  resumeTimer,
  settleTimer,
  startTimer,
  stopTimer,
  timerElapsed,
  timerRemaining,
} from '../lib/timer'
import { Button } from './ui/Button'
import { Card, CardLabel } from './ui/Card'
import { SegmentedControl } from './ui/SegmentedControl'
import { WorkGoalDialog } from './WorkGoalDialog'

const MODES = [
  { value: 'stopwatch', label: 'Stopwatch' },
  { value: 'timer', label: 'Timer' },
]
const PRESETS = [15, 25, 30, 45, 60]
const MAX_TIMER_MINUTES = 12 * 60
const LONG_RUN = 12 * 60 * MINUTE

const RING = 208
const STROKE = 12
const RADIUS = (RING - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Start a stopwatch or a countdown for a block of work. Time is saved as work
// sessions when it pauses, stops or runs out, so it lands in the stats.
export function WorkTimerCard({ state, setState }) {
  const { timer, settings } = state
  const running = Boolean(timer?.startedAt)
  // never earlier than the current stretch, in case the clock hasn't ticked yet
  const tick = useNow(running)
  const now = running ? Math.max(tick, timer.startedAt) : tick
  const [mode, setMode] = useState(timer?.mode ?? 'stopwatch')
  const [minutes, setMinutes] = useState(25)
  const [logged, setLogged] = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)

  // a countdown that hits zero while the page is open: save it and chime
  useEffect(() => {
    if (running && timerRemaining(timer, now) === 0) {
      setState((s) => settleTimer(s))
      playChime()
    }
  }, [running, timer, now, setState])

  useDocumentTitle(
    running
      ? formatClock(timer.durationMs ? timerRemaining(timer, now) : timerElapsed(timer, now))
      : null,
  )

  const elapsed = timerElapsed(timer, now)
  const remaining = timerRemaining(timer, now)
  const isTimer = (timer?.mode ?? mode) === 'timer'

  // the clock and ring: counting down in timer mode, up (looping each hour) otherwise
  let clock, progress, caption
  if (!timer) {
    clock = isTimer ? formatClock(minutes * MINUTE) : formatClock(0)
    progress = 0
    caption = isTimer ? 'Ready' : 'Ready when you are'
  } else if (timer.done) {
    clock = '0:00'
    progress = 1
    caption = "Time's up"
  } else if (isTimer) {
    clock = formatClock(remaining)
    progress = elapsed / timer.durationMs
    caption = running ? 'remaining' : 'Paused'
  } else {
    clock = formatClock(elapsed)
    progress = (elapsed % (60 * MINUTE)) / (60 * MINUTE)
    caption = running ? 'working' : 'Paused'
  }

  // today's total so far, including the stretch that's running
  const today = dayOf(new Date(now), settings)
  const todayKey = toDateKey(today)
  const savedToday = state.workSessions
    .filter((s) => spanDay(s, settings) === todayKey)
    .reduce((sum, s) => sum + spanMinutes(s), 0)
  const todayMinutes = savedToday + (running ? Math.floor((now - timer.startedAt) / MINUTE) : 0)

  const act = (change) => setState((s) => change(s, Date.now()))
  const start = () => {
    setLogged(null)
    act((s, t) => startTimer(s, mode, mode === 'timer' ? minutes : null, t))
  }
  const stop = () => {
    setLogged(elapsed)
    act(stopTimer)
  }
  const finish = () => {
    setLogged(timer.durationMs)
    setState(dismissTimer)
  }

  return (
    <Card className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
      <div className="relative mx-auto" style={{ width: RING, height: RING }}>
        <svg
          width={RING}
          height={RING}
          viewBox={`0 0 ${RING} ${RING}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-empty)"
            strokeWidth={STROKE}
          />
          {progress > 0 && (
            <circle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--color-accent-400)"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(progress, 1))}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p
              role="timer"
              aria-live="off"
              className={`font-display text-5xl font-semibold tabular-nums ${running ? 'text-ink' : 'text-ink-soft'}`}
            >
              {clock}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
              {running && <span className="size-2 animate-pulse rounded-full bg-accent-500" />}
              {caption}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardLabel>Focus</CardLabel>
            <h2 className="mt-1 text-2xl font-semibold">
              {timer?.done
                ? 'Nice work'
                : running
                  ? isTimer
                    ? `${formatDuration(timer.durationMs / MINUTE)} block`
                    : 'On the clock'
                  : timer
                    ? 'Taking a break'
                    : 'Start a work session'}
            </h2>
          </div>
          {!timer && (
            <SegmentedControl label="Timer mode" options={MODES} value={mode} onChange={setMode} />
          )}
        </div>

        {!timer && mode === 'timer' && (
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors ${
                  minutes === m
                    ? 'border-accent-400 bg-accent-100 text-accent-700'
                    : 'border-line bg-white/60 text-ink-soft hover:border-accent-300 hover:text-ink'
                }`}
              >
                {formatDuration(m)}
              </button>
            ))}
            <label className="flex items-center gap-1.5 rounded-full border border-line bg-white/60 py-1 pr-3 pl-1 text-sm font-bold text-ink-soft focus-within:border-accent-400">
              <input
                type="number"
                min={1}
                max={MAX_TIMER_MINUTES}
                value={minutes}
                onChange={(e) => setMinutes(clampMinutes(e.target.value))}
                aria-label="Timer length in minutes"
                className="w-14 rounded-full bg-transparent px-2 py-0.5 text-right text-ink tabular-nums outline-none"
              />
              min
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!timer && (
            <Button onClick={start} className="px-7 py-3 text-base">
              <PlayIcon /> Start {mode === 'timer' ? 'timer' : 'stopwatch'}
            </Button>
          )}
          {running && (
            <>
              <Button variant="outline" onClick={() => act(pauseTimer)}>
                <PauseIcon /> Pause
              </Button>
              <Button onClick={stop}>
                <StopIcon /> Stop &amp; save
              </Button>
            </>
          )}
          {timer && !running && !timer.done && (
            <>
              <Button onClick={() => act(resumeTimer)}>
                <PlayIcon /> Resume
              </Button>
              <Button variant="outline" onClick={stop}>
                <StopIcon /> Stop &amp; save
              </Button>
            </>
          )}
          {timer?.done && <Button onClick={finish}>Done</Button>}

          {logged != null && !timer && (
            <p className="text-sm font-bold text-accent-700">
              {logged >= MINUTE
                ? `Logged ${formatDuration(Math.round(logged / MINUTE))}`
                : 'Too short to log'}
            </p>
          )}
          {timer?.done && (
            <p className="text-sm font-bold text-accent-700">
              Logged {formatDuration(timer.durationMs / MINUTE)}
            </p>
          )}
        </div>

        {running && now - timer.startedAt > LONG_RUN && (
          <p className="text-sm font-semibold text-ink">
            Still going after 12 hours? Stop it if you forgot.
          </p>
        )}

        <TodayBar
          minutes={todayMinutes}
          goal={goalOn(settings, todayKey)}
          onChangeGoal={() => setEditingGoal(true)}
        />
      </div>

      {editingGoal && (
        <WorkGoalDialog
          settings={settings}
          today={today}
          onClose={() => setEditingGoal(false)}
          onSave={(minutes, from) => {
            setState((s) => setWorkGoal(s, minutes, from))
            setEditingGoal(false)
          }}
        />
      )}
    </Card>
  )
}

// Today's work against the daily goal, with a notch per hour. The animated
// energy fill takes over once the goal is reached.
function TodayBar({ minutes, goal, onChangeGoal }) {
  const max = Math.max(goal, minutes)
  const percent = (minutes / max) * 100
  const met = minutes >= goal
  const hours = Math.floor(max / 60)

  return (
    <div className="space-y-2 border-t border-line pt-4">
      <div className="flex items-baseline justify-between gap-4 text-sm text-ink-soft">
        <span>
          Today <span className="font-bold text-ink">{formatDuration(minutes)}</span> of{' '}
          {formatDuration(goal)}
        </span>
        <span className="flex items-baseline gap-3">
          <span className={met ? 'font-bold text-accent-700' : ''}>
            {met ? 'Goal reached' : `${formatDuration(goal - minutes)} to go`}
          </span>
          <button
            type="button"
            onClick={onChangeGoal}
            className="rounded-full font-bold text-accent-700 underline decoration-accent-300 underline-offset-4 transition-colors hover:text-accent-800 hover:decoration-accent-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            Change goal
          </button>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Today's work toward the daily goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(minutes, goal)}
        className="relative h-3 rounded-full bg-empty"
      >
        {met ? (
          <div className="energy h-full rounded-full" style={{ width: `${percent}%` }} />
        ) : (
          minutes > 0 && (
            <div
              className="h-full rounded-full bg-accent-500 transition-[width] duration-700"
              style={{ width: `${percent}%` }}
            />
          )
        )}
        {Array.from({ length: hours }, (_, i) => (i + 1) * 60)
          .filter((m) => m < max)
          .map((m) => (
            <span
              key={m}
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 bg-white/80"
              style={{ left: `${(m / max) * 100}%` }}
            />
          ))}
      </div>
    </div>
  )
}

const clampMinutes = (value) =>
  Math.min(MAX_TIMER_MINUTES, Math.max(1, Math.round(Number(value) || 1)))

// Shows the running clock in the browser tab, restoring the title afterwards
function useDocumentTitle(clock) {
  const original = useRef(document.title)
  useEffect(() => {
    const title = original.current
    document.title = clock ? `${clock} · ${title}` : title
    return () => {
      document.title = title
    }
  }, [clock])
}

// A soft two-note chime for a finished countdown
function playChime() {
  try {
    const audio = new AudioContext()
    ;[660, 880].forEach((freq, i) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      const t = audio.currentTime + i * 0.22
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + 1)
    })
  } catch {
    // no sound is fine
  }
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
