import { describe, expect, it } from 'vitest'
import { createInitialState, updateSettings } from './logins'
import {
  getHoursBars,
  applyWeekBlocks,
  blockLevel,
  getWeekTimeline,
  getWorkRecords,
  getWorkDays,
  getWorkStats,
  goalEntryOn,
  goalOn,
  nextGoalWeek,
  setWeekGoal,
  setWorkGoal,
  workHeading,
  weekBlocks,
  workLevel,
} from './work'

// Nov 2026: Mon 2 … Fri 6, weekend 7–8, Mon 9, Tue 10
const day = (d, h = 23) => new Date(2026, 10, d, h, 0)
const pad = (n) => String(n).padStart(2, '0')

// sessions given as { day: hours } starting at 9 AM; goal defaults to 6h
function stateWith(hours, settings = {}) {
  const state = updateSettings(createInitialState(), settings)
  for (const [d, h] of Object.entries(hours)) {
    const end = 9 * 60 + h * 60
    state.workSessions.push({
      id: d,
      start: `2026-11-${pad(d)}T09:00`,
      end: `2026-11-${pad(d)}T${pad(Math.floor(end / 60))}:${pad(end % 60)}`,
    })
  }
  return state
}

describe('workLevel', () => {
  it('shades by total hours, not the goal', () => {
    expect(workLevel(30)).toBe(1)
    expect(workLevel(150)).toBe(2)
    expect(workLevel(300)).toBe(3)
    expect(workLevel(400)).toBe(4)
    expect(workLevel(500)).toBe(5)
  })

  it('gives under-goal days a shade from their hours too', () => {
    const [short, met] = getWorkDays(stateWith({ 5: 3, 6: 7 }), day(5), day(6))
    expect(short).toMatchObject({ status: 'partial', level: 2 })
    expect(met).toMatchObject({ status: 'hit', level: 4 })
  })
})

describe('getWorkDays', () => {
  it('classifies weekdays against the goal and skips weekends', () => {
    const state = stateWith({ 5: 7, 6: 3, 7: 4, 10: 2 })
    expect(getWorkDays(state, day(1), day(10)).map((d) => [d.date.slice(8), d.status])).toEqual([
      ['05', 'hit'],
      ['06', 'partial'],
      ['09', 'missed'],
      ['10', 'pending'],
    ])
  })

  it('tracks weekends when turned on', () => {
    const state = stateWith({ 6: 6, 7: 6 }, { workWeekends: true })
    expect(getWorkDays(state, day(1), day(8)).map((d) => d.status)).toEqual(['hit', 'hit', 'pending'])
  })

  it('adds up several sessions in a day', () => {
    const state = stateWith({ 5: 4 })
    state.workSessions.push({ id: 'b', start: '2026-11-05T14:00', end: '2026-11-05T16:30' })
    expect(getWorkDays(state, day(5), day(5))[0]).toMatchObject({ status: 'hit', minutes: 390 })
  })
})

describe('getWorkStats', () => {
  it('streaks across the weekend and breaks on a short day', () => {
    const state = stateWith({ 2: 6, 3: 3, 4: 6, 5: 6, 6: 7, 9: 6.5 })
    const stats = getWorkStats(state, 'all', day(10))
    expect(stats.currentStreak).toBe(4)
    expect(stats.bestStreak).toBe(4)
    expect(stats.partial).toBe(1)
    expect(stats.averageMinutes).toBeCloseTo((6 + 3 + 6 + 6 + 7 + 6.5) * 10)
  })
})

describe('workHeading', () => {
  const heading = (hours, running = false) => {
    const state = stateWith(hours == null ? {} : { 10: hours })
    if (running) state.timer = { mode: 'stopwatch', startedAt: 1, elapsedBefore: 0 }
    return workHeading(state, day(10))
  }

  it('follows how much is logged today against the goal', () => {
    expect(heading(null)).toBe('Time to Build')
    expect(heading(0.25)).toBe('Time to Build') // under 30 min
    expect(heading(2)).toBe('In the Zone')
    expect(heading(6)).toBe('Brick by Brick')
  })

  it('shows Flow State while the timer runs, unless the goal is already reached', () => {
    expect(heading(null, true)).toBe('Flow State')
    expect(heading(2, true)).toBe('Flow State')
    expect(heading(7, true)).toBe('Brick by Brick')
  })
})

describe('goal history', () => {
  const ramp = () => {
    let state = stateWith({ 2: 2, 3: 2.5, 4: 2.5, 9: 2.5, 10: 3 }, {})
    state = setWorkGoal(state, 120, '2000-01-01') // replaces the default first entry
    state = setWorkGoal(state, 150, '2026-11-04')
    return setWorkGoal(state, 180, '2026-11-09')
  }

  it('uses the goal in effect on each day', () => {
    const { settings } = ramp()
    expect(settings.workGoals.map((g) => g.minutes)).toEqual([120, 150, 180])
    expect(goalOn(settings, '2026-10-01')).toBe(120)
    expect(goalOn(settings, '2026-11-03')).toBe(120)
    expect(goalOn(settings, '2026-11-04')).toBe(150)
    expect(goalOn(settings, new Date(2026, 10, 20))).toBe(180)
  })

  it('grades each day against its own goal, so raising it keeps old hits', () => {
    const days = getWorkDays(ramp(), day(2), day(10))
    expect(days.map((d) => [d.date.slice(8), d.status, d.goal])).toEqual([
      ['02', 'hit', 120],
      ['03', 'hit', 120],
      ['04', 'hit', 150],
      ['05', 'missed', 150],
      ['06', 'missed', 150],
      ['09', 'partial', 180],
      ['10', 'hit', 180],
    ])
  })

  it('finds the entry in effect, marking the starting goal', () => {
    const { settings } = ramp()
    expect(goalEntryOn(settings, '2026-10-01')).toMatchObject({ minutes: 120, first: true })
    expect(goalEntryOn(settings, '2026-11-12')).toEqual({ from: '2026-11-09', minutes: 180, first: false })
  })

  it('replaces a change that starts on the same day', () => {
    const state = setWorkGoal(setWorkGoal(ramp(), 200, '2026-11-09'), 210, '2026-11-09')
    expect(state.settings.workGoals.at(-1)).toEqual({ from: '2026-11-09', minutes: 210 })
    expect(state.settings.workGoals).toHaveLength(3)
  })

  it('starts new goals on the coming Monday', () => {
    expect(nextGoalWeek(new Date(2026, 10, 18))).toBe('2026-11-23') // Wednesday
    expect(nextGoalWeek(new Date(2026, 10, 16))).toBe('2026-11-23') // Monday: next week
  })
})

describe('getHoursBars', () => {
  // Nov 2026, goal 3h until Mon Nov 9, then 4h; today is Tue Nov 10
  const state = () => {
    let s = stateWith({ 2: 3, 3: 2, 4: 3.5, 5: 3, 6: 1, 9: 4.5 }, {})
    s = setWorkGoal(s, 180, '2000-01-01')
    return setWorkGoal(s, 240, '2026-11-09')
  }

  it('gives one bar per tracked day with that day\'s goal', () => {
    const { by, bars } = getHoursBars(state(), '7d', day(10))
    expect(by).toBe('day')
    expect(bars.map((b) => [b.key.slice(8), b.minutes / 60, b.goal / 60, b.met])).toEqual([
      ['04', 3.5, 3, true],
      ['05', 3, 3, true],
      ['06', 1, 3, false],
      ['09', 4.5, 4, true],
      ['10', 0, 4, false],
    ])
    expect(bars.at(-1).pending).toBe(true)
  })

  it('averages each week for long ranges, leaving out an empty today', () => {
    const { by, bars } = getHoursBars(state(), 'all', day(10))
    expect(by).toBe('week')
    expect(bars.map((b) => [b.key, b.minutes / 60, b.goal / 60, b.met, b.metDays, b.days])).toEqual([
      ['2026-11-02', 2.5, 3, false, 3, 5],
      ['2026-11-09', 4.5, 4, true, 1, 1],
    ])
  })
})

describe('getWorkRecords', () => {
  // today is Tue Nov 10
  const base = () => {
    const state = stateWith({ 2: 7, 5: 4, 9: 3 })
    state.workSessions.push({ id: 'b', start: '2026-11-10T09:00', end: '2026-11-10T11:30' })
    return state
  }

  it('finds the longest day, longest block and the totals', () => {
    const r = getWorkRecords(base(), day(10), day(10, 12).getTime())
    expect(r.todayMinutes).toBe(150)
    expect(r.longestDay).toEqual({ minutes: 420, date: '2026-11-02' })
    expect(r.newRecord).toBe(false)
    expect(r.longestBlock).toEqual({ minutes: 420, date: '2026-11-02' })
    expect(r.weekMinutes).toBe(180 + 150) // Mon 9 + today
    expect(r.totalMinutes).toBe(420 + 240 + 180 + 150)
  })

  it('counts a running timer live and flags a new longest day', () => {
    const state = base()
    // started at 1 PM; at 6:31 PM today has 2h 30m + 5h 31m = 8h 1m
    state.timer = { mode: 'stopwatch', startedAt: day(10, 13).getTime(), elapsedBefore: 0 }
    const r = getWorkRecords(state, day(10), day(10, 18).getTime() + 31 * 60000)
    expect(r.todayMinutes).toBe(481)
    expect(r.newRecord).toBe(true)
    expect(r.longestDay).toEqual({ minutes: 481, date: '2026-11-10' })
    expect(r.longestBlock).toEqual({ minutes: 420, date: '2026-11-02' }) // Nov 2's 7h block is longer
    // a running block longer than any saved one becomes the longest
    const long = getWorkRecords(state, day(10), day(10, 21).getTime())
    expect(long.longestBlock).toMatchObject({ minutes: 480, date: '2026-11-10' })
  })
})

describe('getWeekTimeline', () => {
  it('places this week\'s sessions on each day, with a running stretch live', () => {
    const state = stateWith({ 2: 2, 4: 1 }) // 9 AM each
    state.workSessions.push({ id: 'late', start: '2026-11-03T23:00', end: '2026-11-04T01:30' }) // Tue night
    state.workSessions.push({ id: 'old', start: '2026-10-30T09:00', end: '2026-10-30T10:00' }) // last week
    state.timer = { mode: 'stopwatch', startedAt: day(4, 13).getTime(), elapsedBefore: 0 }
    const t = getWeekTimeline(state, day(4), day(4, 14).getTime())

    expect(t.days.map((d) => d.date.slice(8))).toEqual(['02', '03', '04', '05', '06', '07', '08'])
    expect(t.days[0].blocks).toEqual([{ start: 540, end: 660, minutes: 120, level: 4 }])
    // after midnight still belongs to Tuesday, so it runs past 24:00
    expect(t.days[1].blocks).toEqual([{ start: 1380, end: 1530, minutes: 150, level: 4 }])
    expect(t.days[2].blocks).toEqual([
      { start: 540, end: 600, minutes: 60, level: 3 },
      { start: 780, end: 840, minutes: 60, level: 3, running: true },
    ])
    expect(t.days[2]).toMatchObject({ minutes: 120, today: true, future: false })
    expect(t.days[3].future).toBe(true)
    // the axis widens to fit the late session
    expect([t.from, t.to]).toEqual([360, 26 * 60])
    expect(t.now).toBe(14 * 60)
  })
})

describe('timeline weeks and shading', () => {
  it('shades blocks by length', () => {
    expect([20, 30, 75, 120].map(blockLevel)).toEqual([1, 2, 3, 4])
  })

  it('can show an earlier week, still marking today correctly', () => {
    const state = stateWith({ 30: 1 }) // Fri Oct 30 is in the week before
    state.workSessions[0] = { id: 'o', start: '2026-10-30T09:00', end: '2026-10-30T10:00' }
    const t = getWeekTimeline(state, day(4), day(4, 12).getTime(), new Date(2026, 9, 28))
    expect(t.start).toBe('2026-10-26')
    expect(t.days[4].blocks).toHaveLength(1)
    expect(t.days.some((d) => d.today)).toBe(false)
    expect(t.days.every((d) => !d.future)).toBe(true)
  })
})

describe('editing a week', () => {
  const week = '2026-11-02'
  const state = () => {
    const s = stateWith({ 2: 2, 4: 1 }) // 9 AM
    s.workSessions.push({ id: 'late', start: '2026-11-03T23:00', end: '2026-11-04T01:30' })
    s.workSessions.push({ id: 'other', start: '2026-11-10T09:00', end: '2026-11-10T10:00' }) // next week
    return s
  }

  it('turns the week\'s sessions into blocks', () => {
    expect(weekBlocks(state(), week)).toEqual([
      { id: '2', day: '2026-11-02', start: 540, end: 660 },
      { id: 'late', day: '2026-11-03', start: 1380, end: 1530 },
      { id: '4', day: '2026-11-04', start: 540, end: 600 },
    ])
  })

  it('saves edited, moved, added and deleted blocks back as sessions', () => {
    const blocks = weekBlocks(state(), week)
    blocks[0] = { ...blocks[0], start: 510, end: 690 } // longer
    blocks[1] = { ...blocks[1], day: '2026-11-05', start: 600, end: 750 } // moved to Thursday
    blocks.splice(2, 1) // deleted
    blocks.push({ id: 'new', day: '2026-11-06', start: 780, end: 810 }) // added
    const saved = applyWeekBlocks(state(), week, blocks)
    expect(saved.workSessions.map(({ id, start, end }) => [id, start, end]).sort()).toEqual([
      ['2', '2026-11-02T08:30', '2026-11-02T11:30'],
      ['late', '2026-11-05T10:00', '2026-11-05T12:30'],
      ['new', '2026-11-06T13:00', '2026-11-06T13:30'],
      ['other', '2026-11-10T09:00', '2026-11-10T10:00'],
    ].sort())
    // round trip: the same blocks come back out
    expect(weekBlocks(saved, week)).toHaveLength(3)
  })

  it('writes a block past midnight as the next calendar day', () => {
    const saved = applyWeekBlocks(state(), week, [{ id: 'n', day: '2026-11-02', start: 1410, end: 1470 }])
    const n = saved.workSessions.find((s) => s.id === 'n')
    expect([n.start, n.end]).toEqual(['2026-11-02T23:30', '2026-11-03T00:30'])
  })
})

describe('setWeekGoal', () => {
  // 2h from the start, 6h from Mon Nov 2, a mid-week change to 7h on Thu Nov 12
  const settings = () =>
    setWorkGoal(setWorkGoal(setWorkGoal(createInitialState(), 120, '2000-01-01'), 360, '2026-11-02'), 420, '2026-11-12')
      .settings
  const summary = (s) => s.workGoals.map((g) => `${g.from}=${g.minutes / 60}h`).join(' ')

  it('changes just that week and puts the old goal back after it', () => {
    const s = setWeekGoal(settings(), '2026-11-09', 240, 'week')
    // the Thursday change inside the week is folded in; 7h comes back on the next Monday
    expect(summary(s)).toBe('2000-01-01=2h 2026-11-02=6h 2026-11-09=4h 2026-11-16=7h')
    expect(goalOn(s, '2026-11-13')).toBe(240)
    expect(goalOn(s, '2026-11-20')).toBe(420)
  })

  it('changes the goal from that week on, until the next change', () => {
    const s = setWeekGoal(settings(), '2026-10-26', 300, 'onward')
    expect(summary(s)).toBe('2000-01-01=2h 2026-10-26=5h 2026-11-02=6h 2026-11-12=7h')
  })

  it('merges entries that end up the same', () => {
    const s = setWeekGoal(settings(), '2026-11-02', 120, 'onward')
    expect(summary(s)).toBe('2000-01-01=2h 2026-11-12=7h')
  })
})
