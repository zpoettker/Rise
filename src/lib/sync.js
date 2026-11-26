import { createInitialState, parseBackup } from './logins'

// Syncing with the account (Supabase): turning the app's state into table
// rows and back, and working out what changed between two versions so only
// that is sent. No network here (see remote.js), so it's all testable.
//
// Rows per table (user_id is added when sending):
//   profile        { settings, timer }
//   wake_logs      { date, time, edited }           key: date
//   workouts       { id, started_at, ended_at }     key: id
//   work_sessions  { id, started_at, ended_at }     key: id
//   weights        { id, at, kg }                   key: id
//   custom_days    { date, kind: 'done' | 'slip' }  key: date + kind

export const TABLES = ['wake_logs', 'workouts', 'work_sessions', 'weights', 'custom_days']

// how each table's rows are told apart
export const KEYS = {
  wake_logs: ['date'],
  workouts: ['id'],
  work_sessions: ['id'],
  weights: ['id'],
  custom_days: ['date', 'kind'],
}

const rowKey = (table, row) => KEYS[table].map((k) => row[k]).join('|')

// The app's state as rows
export function toRows(state) {
  return {
    profile: { settings: state.settings, timer: state.timer ?? null },
    wake_logs: Object.entries(state.entries).map(([date, entry]) => ({
      date,
      time: entry.time,
      edited: Boolean(entry.edited),
    })),
    workouts: state.workouts
      .filter((w) => w.end)
      .map((w) => ({ id: w.id, started_at: w.start, ended_at: w.end })),
    work_sessions: state.workSessions
      .filter((s) => s.end)
      .map((s) => ({ id: s.id, started_at: s.start, ended_at: s.end })),
    weights: state.weights.map((w) => ({ id: w.id, at: w.at, kg: w.kg })),
    custom_days: [
      ...Object.keys(state.customLog ?? {}).map((date) => ({ date, kind: 'done' })),
      ...Object.keys(state.customSlips ?? {}).map((date) => ({ date, kind: 'slip' })),
    ],
  }
}

// '2026-11-24T18:00:00' (how Postgres sends a timestamp back) → '2026-11-24T18:00'
const minute = (value) => String(value).slice(0, 16)

// Rows from the account back into the app's state. Goes through the backup
// checks, so anything odd in the database can't break the app.
export function fromRows(rows) {
  const backup = {
    settings: rows.profile?.settings ?? {},
    entries: Object.fromEntries(
      rows.wake_logs.map((r) => [
        r.date,
        r.edited ? { time: r.time, edited: true } : { time: r.time },
      ]),
    ),
    workouts: rows.workouts.map((r) => ({
      id: r.id,
      start: minute(r.started_at),
      end: minute(r.ended_at),
    })),
    workSessions: rows.work_sessions.map((r) => ({
      id: r.id,
      start: minute(r.started_at),
      end: minute(r.ended_at),
    })),
    weights: rows.weights.map((r) => ({ id: r.id, at: minute(r.at), kg: Number(r.kg) })),
    customLog: Object.fromEntries(
      rows.custom_days.filter((r) => r.kind === 'done').map((r) => [r.date, true]),
    ),
    customSlips: Object.fromEntries(
      rows.custom_days.filter((r) => r.kind === 'slip').map((r) => [r.date, true]),
    ),
  }
  return { ...parseBackup(JSON.stringify(backup)), timer: rows.profile?.timer ?? null }
}

// Nothing in the account yet (a brand-new one)
export function isEmptyAccount(rows) {
  const settings = rows.profile?.settings ?? {}
  return TABLES.every((t) => rows[t].length === 0) && Object.keys(settings).length === 0
}

// Anything worth uploading in a device's saved data
export function hasData(state) {
  const empty = createInitialState()
  return (
    Object.keys(state.entries).length > 0 ||
    state.workouts.length > 0 ||
    state.workSessions.length > 0 ||
    state.weights.length > 0 ||
    Object.keys(state.customLog ?? {}).length > 0 ||
    JSON.stringify(state.settings) !== JSON.stringify(empty.settings)
  )
}

// What to send to get from `prev` rows to `next` rows: per table, the rows
// that are new or changed (`upsert`) and the keys of rows that are gone
// (`remove`), plus whether the profile changed. `prev` null means everything.
export function diffRows(prev, next) {
  const changes = {}
  let any = false
  for (const table of TABLES) {
    const before = new Map((prev?.[table] ?? []).map((r) => [rowKey(table, r), r]))
    const after = new Map(next[table].map((r) => [rowKey(table, r), r]))
    const upsert = [...after].filter(
      ([k, r]) => JSON.stringify(before.get(k)) !== JSON.stringify(r),
    )
    const remove = [...before.keys()].filter((k) => !after.has(k))
    changes[table] = {
      upsert: upsert.map(([, r]) => r),
      remove: remove.map((k) => before.get(k)),
    }
    if (upsert.length || remove.length) any = true
  }
  const profile = JSON.stringify(prev?.profile) !== JSON.stringify(next.profile)
  return { tables: changes, profile, any: any || profile }
}
