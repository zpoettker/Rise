import { format, parseISO } from 'date-fns'
import { formatDuration } from '../../lib/stats'
import { Card, CardLabel } from '../ui/Card'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Full-width progress toward this week's workout goal. `week` comes from
// getWorkoutWeek: { start, end, goal, workoutDays, minutes, daysLeft, days }.
// `onSelectDay(date)` makes the day dots clickable (past days and today).
export function WeekProgressCard({ week, onSelectDay }) {
  const { goal, workoutDays, daysLeft } = week
  const met = workoutDays >= goal
  // one slot per goal day, growing to fit when the week goes over the goal
  const slots = Math.max(goal, workoutDays)
  const percent = (workoutDays / slots) * 100
  const start = parseISO(week.start)
  const end = parseISO(week.end)
  const range = `${format(start, 'MMM d')} – ${format(end, start.getMonth() === end.getMonth() ? 'd' : 'MMM d')}`

  let status
  if (met) {
    const extra = workoutDays - goal
    status = extra ? `Goal crushed · ${extra} extra` : 'Goal crushed'
  } else {
    const left = daysLeft === 1 ? 'last day' : `${daysLeft} days left`
    status = `${goal - workoutDays} more to go · ${left}`
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <CardLabel>This week</CardLabel>
          <h2 className="mt-1 text-2xl font-semibold">{range}</h2>
        </div>
        <ol className="flex gap-1.5" aria-label="Workout days this week">
          {week.days.map((day, i) => {
            const label = `${format(parseISO(day.date), 'EEEE')}: ${
              day.worked ? 'worked out' : day.future ? 'coming up' : 'rest'
            }`
            const dot = `size-6 rounded-full ${
              day.worked
                ? 'bg-accent-500'
                : day.future
                  ? 'border-2 border-dashed border-line'
                  : 'bg-empty'
            } ${day.today ? 'ring-2 ring-accent-600 ring-offset-2 ring-offset-white' : ''}`
            return (
              <li key={day.date} className="flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-ink-soft">{WEEKDAYS[i]}</span>
                {/* past days and today open the day's workouts */}
                {onSelectDay && !day.future ? (
                  <button
                    type="button"
                    aria-label={`${label}. Edit workouts`}
                    title={`${format(parseISO(day.date), 'EEE, MMM d')} · edit workouts`}
                    onClick={() => onSelectDay(day.date)}
                    className={`${dot} cursor-pointer transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500`}
                  />
                ) : (
                  <span aria-label={label} className={dot} />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <p className="font-display text-5xl font-semibold tabular-nums">
          <span className="text-accent-600">{workoutDays}</span>
          <span className="text-ink-soft"> / {goal}</span>
          <span className="ml-2 font-sans text-lg font-bold text-ink-soft">
            workout {goal === 1 ? 'day' : 'days'}
          </span>
        </p>
        <p className="pb-1.5 text-sm text-ink-soft">
          <span className={`font-bold ${met ? 'text-accent-700' : 'text-ink'}`}>{status}</span>
          {week.minutes > 0 && ` · ${formatDuration(week.minutes)} total`}
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={slots}
        aria-valuenow={workoutDays}
        aria-label="Weekly goal progress"
        className="relative h-5 rounded-full bg-empty"
      >
        {/* plain fill on the way to the goal; the animated energy fill once it's met */}
        {met ? (
          <div className="energy h-full rounded-full" style={{ width: `${percent}%` }} />
        ) : (
          workoutDays > 0 && (
            <div
              className="bar-in h-full rounded-full bg-accent-500"
              style={{ width: `${percent}%` }}
            />
          )
        )}
        {/* a notch between slots */}
        {Array.from({ length: slots - 1 }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 bg-white/80"
            style={{ left: `${((i + 1) / slots) * 100}%` }}
          />
        ))}
      </div>
    </Card>
  )
}
