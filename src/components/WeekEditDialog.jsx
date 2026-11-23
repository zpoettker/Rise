import { addWeeks, parseISO, startOfWeek } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
import { MAX_WORK_GOAL_MINUTES, MIN_WORK_GOAL_MINUTES } from '../lib/logins'
import { formatDuration } from '../lib/stats'
import {
  applyWeekBlocks,
  blockLevel,
  getWeekTimeline,
  goalOn,
  setWeekGoal,
  weekBlocks,
  workStart,
} from '../lib/work'
import { weekLabel } from '../lib/timeline'
import { BlockLegend, TimelineGrid } from './charts/timeline'
import { Button } from './ui/Button'
import { Dialog, DialogTitle } from './ui/Dialog'
import { NavButton } from './ui/NavButton'
import { SegmentedControl } from './ui/SegmentedControl'
import { TrashIcon } from './ui/TrashIcon'

const SNAP = 5 // minutes
const MIN_LENGTH = 15
const CLICK_LENGTH = 30 // a click on empty space adds a block this long
const EDIT_FROM = 5 * 60 // the axis covers at least 5 AM to midnight
const EDIT_TO = 24 * 60

const snap = (m) => Math.round(m / SNAP) * SNAP
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
const minutesOf = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Edit a week's work sessions, a bit like a video editor's timeline: drag a
// block's edges to resize it, drag the block to move it (to another time or
// day), drag across empty space to add one (or click for 30 minutes), and
// select one + Delete (or the trash button) to remove it. Opened from the
// timeline's pencil or a Work calendar day, which is highlighted (`day`).
// Changes stay in a draft until Save. Blocks snap to 5 minutes, can't overlap,
// stay inside their day (from the day start) and can't go into the future; a
// running timer's block is read-only.
export function WeekEditDialog({ state, setState, today, now, day, onClose }) {
  const [weekOf, setWeekOf] = useState(() => parseISO(day))
  const timeline = getWeekTimeline(state, today, now, weekOf)
  const [draft, setDraft] = useState(() => weekBlocks(state, timeline.start))
  const [saved, setSaved] = useState(draft) // to tell whether anything changed
  // the goal history with this week's goal change, saved along with the blocks
  const [goals, setGoals] = useState(state.settings.workGoals)
  const [goalForm, setGoalForm] = useState(null) // { hours, scope } while the goal editor is open
  const [selected, setSelected] = useState(null)
  const [drag, setDrag] = useState(null)
  const tracks = useRef({}) // day → its track element, for pointer maths

  const from = Math.max(minutesOf(state.settings.dayStart), Math.min(timeline.from, EDIT_FROM))
  const to = Math.max(timeline.to, EDIT_TO)
  const span = to - from
  const dayStart = minutesOf(state.settings.dayStart)
  const goalSettings = { ...state.settings, workGoals: goals }
  const dirty = draft !== saved || goals !== state.settings.workGoals
  const first = workStart(state)
  const thisWeek = timeline.days.some((d) => d.today)
  const canGoBack = first && parseISO(timeline.start) > startOfWeek(first, { weekStartsOn: 1 })

  // the draft per day, plus a running timer's block (read-only)
  const rows = timeline.days.map((d) => {
    const blocks = [
      ...draft
        .filter((b) => b.day === d.date)
        .map((b) => ({ ...b, minutes: b.end - b.start, level: blockLevel(b.end - b.start) })),
      ...d.blocks.filter((b) => b.running).map((b) => ({ ...b, id: 'running' })),
    ]
    const minutes = blocks.reduce((sum, b) => sum + b.minutes, 0)
    const goal = goalOn(goalSettings, d.date)
    return { ...d, blocks, minutes, goal, met: minutes >= goal, editable: !d.future }
  })

  const goToWeek = (weeks) => {
    const next = addWeeks(weekOf, weeks)
    const blocks = weekBlocks(state, getWeekTimeline(state, today, now, next).start)
    setWeekOf(next)
    setDraft(blocks)
    setSaved(blocks)
    setGoals(state.settings.workGoals)
    setGoalForm(null)
    setSelected(null)
  }

  // where a block may go on a day: inside the day (from the day start) and
  // the axis, and not past now
  const limits = (date) => {
    const isToday = rows.find((d) => d.date === date)?.today
    return {
      lo: Math.max(from, dayStart),
      hi: Math.min(to, dayStart + 24 * 60, isToday ? snap(timeline.now) : Infinity),
    }
  }
  const minuteAt = (date, clientX) => {
    const rect = tracks.current[date].getBoundingClientRect()
    return from + ((clientX - rect.left) / rect.width) * span
  }
  // the editable day whose row is nearest the pointer
  const dayAt = (clientY) => {
    let best = null
    for (const d of rows) {
      if (!d.editable) continue
      const rect = tracks.current[d.date].getBoundingClientRect()
      const dist = Math.abs(clientY - (rect.top + rect.height / 2))
      if (!best || dist < best.dist) best = { date: d.date, dist }
    }
    return best?.date
  }
  const others = (blocks, date, id) => blocks.filter((b) => b.day === date && b.id !== id)
  const overlaps = (list, start, end) => list.some((b) => start < b.end && end > b.start)
  const update = (id, change) =>
    setDraft((list) => list.map((b) => (b.id === id ? { ...b, ...change } : b)))
  const remove = (id) => {
    setDraft((list) => list.filter((b) => b.id !== id))
    setSelected(null)
  }

  // grabbing a block: its body moves it, its edges resize it
  const grab = (event, block, mode) => {
    event.stopPropagation()
    event.preventDefault()
    setSelected(block.id)
    setDrag({ mode, id: block.id, orig: block, downAt: minuteAt(block.day, event.clientX) })
  }

  // pressing on empty space starts a new block there
  const press = (event, row) => {
    if (!row.editable) return
    event.preventDefault()
    const { lo, hi } = limits(row.date)
    const m = clamp(snap(minuteAt(row.date, event.clientX)), lo, hi)
    const list = others(draft, row.date, null)
    if (list.some((b) => m >= b.start && m < b.end) || m >= hi) return
    const gapLo = Math.max(lo, ...list.filter((b) => b.end <= m).map((b) => b.end))
    const gapHi = Math.min(hi, ...list.filter((b) => b.start >= m).map((b) => b.start))
    const id = `edit-${crypto.randomUUID()}`
    setDraft((blocks) => [...blocks, { id, day: row.date, start: m, end: m }])
    setSelected(id)
    setDrag({ mode: 'create', id, day: row.date, anchor: m, gapLo, gapHi })
  }

  // follow the pointer while dragging, then settle the block on release
  useEffect(() => {
    if (!drag) return
    const onMove = (event) => {
      if (drag.mode === 'create') {
        const m = snap(minuteAt(drag.day, event.clientX))
        update(drag.id, {
          start: clamp(Math.min(drag.anchor, m), drag.gapLo, drag.anchor),
          end: clamp(Math.max(drag.anchor, m), drag.anchor, drag.gapHi),
        })
        return
      }
      const { orig } = drag
      const delta = snap(minuteAt(orig.day, event.clientX) - drag.downAt)
      setDraft((blocks) => {
        const list = others(blocks, orig.day, orig.id)
        let change
        if (drag.mode === 'left') {
          const floor = Math.max(
            limits(orig.day).lo,
            ...list.filter((b) => b.end <= orig.start).map((b) => b.end),
          )
          change = { start: clamp(orig.start + delta, floor, orig.end - MIN_LENGTH) }
        } else if (drag.mode === 'right') {
          const ceil = Math.min(
            limits(orig.day).hi,
            ...list.filter((b) => b.start >= orig.end).map((b) => b.start),
          )
          change = { end: clamp(orig.end + delta, orig.start + MIN_LENGTH, ceil) }
        } else {
          const target = dayAt(event.clientY) ?? orig.day
          const { lo, hi } = limits(target)
          const length = orig.end - orig.start
          if (hi - lo < length) return blocks
          const start = clamp(orig.start + delta, lo, hi - length)
          const invalid = overlaps(others(blocks, target, orig.id), start, start + length)
          change = { day: target, start, end: start + length, invalid }
        }
        return blocks.map((b) => (b.id === orig.id ? { ...b, ...change } : b))
      })
    }
    const onUp = () => {
      setDraft((blocks) =>
        blocks
          .map((b) => {
            if (b.id !== drag.id) return b
            // a move that lands on another block goes back where it was
            if (b.invalid) return { ...drag.orig, invalid: undefined }
            if (drag.mode === 'create' && b.end - b.start < MIN_LENGTH) {
              const end = Math.min(b.start + CLICK_LENGTH, drag.gapHi)
              return end - b.start >= MIN_LENGTH ? { ...b, end } : null
            }
            return { ...b, invalid: undefined }
          })
          .filter(Boolean),
      )
      setDrag(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  })

  // Delete / Backspace removes the selected block; Esc lets go of it first
  useEffect(() => {
    const onKey = (event) => {
      if (event.target.closest?.('input, textarea')) return
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
        event.preventDefault()
        remove(selected)
      } else if (event.key === 'Escape' && selected) {
        event.preventDefault()
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const save = () => {
    const week = timeline.start
    setState((s) =>
      applyWeekBlocks({ ...s, settings: { ...s.settings, workGoals: goals } }, week, draft),
    )
    onClose()
  }

  // the week's goal: one value, or a range if it changed partway through
  const weekGoals = [...new Set(rows.map((d) => d.goal))]
  const goalText =
    weekGoals.length === 1
      ? `${formatDuration(weekGoals[0])} a day`
      : `${formatDuration(Math.min(...weekGoals))}–${formatDuration(Math.max(...weekGoals))} a day`
  const goalMinutes = goalForm ? Math.round(Number(goalForm.hours) * 60) : 0
  const goalValid =
    goalForm &&
    goalForm.hours !== '' &&
    goalMinutes >= MIN_WORK_GOAL_MINUTES &&
    goalMinutes <= MAX_WORK_GOAL_MINUTES
  const applyGoal = () => {
    if (!goalValid) return
    setGoals(setWeekGoal(goalSettings, timeline.start, goalMinutes, goalForm.scope).workGoals)
    setGoalForm(null)
  }

  return (
    <Dialog onClose={onClose} wide>
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <DialogTitle label={thisWeek ? 'Edit this week' : 'Edit week'}>
              {weekLabel(timeline.start, today)}
            </DialogTitle>
            <button
              type="button"
              onClick={() =>
                setGoalForm(goalForm ? null : { hours: String(rows[0].goal / 60), scope: 'week' })
              }
              aria-expanded={Boolean(goalForm)}
              className={`mb-0.5 flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold transition-colors ${
                goalForm
                  ? 'border-accent-400 bg-accent-100 text-accent-700'
                  : 'border-line bg-white/70 text-ink hover:border-accent-300'
              }`}
            >
              <span className="text-ink-soft">Goal</span> {goalText}
            </button>
          </div>
          <div className="flex items-center gap-1">
            {dirty && (
              <span className="mr-2 text-xs font-semibold text-ink-soft">
                Save or cancel to change weeks
              </span>
            )}
            <NavButton
              label="Previous week"
              disabled={!canGoBack || dirty}
              onClick={() => goToWeek(-1)}
            >
              ‹
            </NavButton>
            <NavButton label="Next week" disabled={thisWeek || dirty} onClick={() => goToWeek(1)}>
              ›
            </NavButton>
          </div>
        </div>

        {goalForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              applyGoal()
            }}
            className="flex flex-wrap items-end gap-4 rounded-2xl border border-accent-200 bg-accent-50 p-4"
          >
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Daily goal (hours)</span>
              <input
                type="number"
                autoFocus
                min={MIN_WORK_GOAL_MINUTES / 60}
                max={MAX_WORK_GOAL_MINUTES / 60}
                step="0.25"
                inputMode="decimal"
                value={goalForm.hours}
                onChange={(e) => setGoalForm({ ...goalForm, hours: e.target.value })}
                className="mt-1 block w-28 rounded-xl border border-line bg-white px-3 py-2 font-display text-xl tabular-nums focus:border-accent-400 focus:outline-none focus:ring-4 focus:ring-accent-200/60"
              />
            </label>
            <div>
              <span className="text-xs font-semibold text-ink-soft">Apply to</span>
              <div className="mt-1">
                <SegmentedControl
                  label="Apply the goal to"
                  options={[
                    { value: 'week', label: 'This week only' },
                    { value: 'onward', label: 'From this week on' },
                  ]}
                  value={goalForm.scope}
                  onChange={(scope) => setGoalForm({ ...goalForm, scope })}
                />
              </div>
            </div>
            <p className="min-w-48 flex-1 pb-2 text-xs text-ink-soft">
              {!goalValid
                ? 'Between 15 minutes and 16 hours'
                : goalForm.scope === 'week'
                  ? `${formatDuration(goalMinutes)} a day for these 7 days; the goal after them stays as it was.`
                  : `${formatDuration(goalMinutes)} a day from this Monday until your next goal change.`}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setGoalForm(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!goalValid}>
                Apply
              </Button>
            </div>
          </form>
        )}

        <p className="text-sm text-ink-soft">
          Drag edges to resize · drag a block to move it · drag on empty space to add · select one
          and press Delete to remove
        </p>

        <TimelineGrid
          rows={rows}
          from={from}
          to={to}
          now={thisWeek ? timeline.now : null}
          focus={day}
          editing
          trackRef={(date, el) => (tracks.current[date] = el)}
          selected={selected}
          dragId={drag?.id}
          onPress={press}
          onGrab={grab}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <BlockLegend />
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Delete selected block"
              title="Delete selected block"
              disabled={!selected}
              onClick={() => remove(selected)}
              className="grid size-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-accent-100 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <TrashIcon className="size-5" />
            </button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!dirty}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
