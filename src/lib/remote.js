import { supabase } from './supabase'
import { KEYS, TABLES } from './sync'

// Reading and writing the account's rows in Supabase. The shapes are in
// sync.js; row-level security keeps every query to the signed-in account.

const PAGE = 1000 // Supabase returns at most this many rows per request
const CHUNK = 500 // rows per write, so a big first upload isn't one huge request

const COLUMNS = {
  wake_logs: 'date, time, edited',
  workouts: 'id, started_at, ended_at',
  work_sessions: 'id, started_at, ended_at',
  weights: 'id, at, kg',
  custom_days: 'date, kind',
}

async function selectAll(table, userId) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(COLUMNS[table])
      .eq('user_id', userId)
      .order(KEYS[table][0])
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

// Everything in the account, as rows (see sync.js)
export async function loadRemote(userId) {
  const [profile, ...tables] = await Promise.all([
    supabase.from('profiles').select('settings, timer').eq('id', userId).maybeSingle(),
    ...TABLES.map((t) => selectAll(t, userId)),
  ])
  if (profile.error) throw profile.error
  return {
    profile: profile.data ?? { settings: {}, timer: null },
    ...Object.fromEntries(TABLES.map((t, i) => [t, tables[i]])),
  }
}

const chunks = (list) =>
  Array.from({ length: Math.ceil(list.length / CHUNK) }, (_, i) =>
    list.slice(i * CHUNK, (i + 1) * CHUNK),
  )

// Sends a diff from diffRows: the profile if it changed, new or changed rows,
// and deletes for rows that are gone. Throws if any part fails, so the caller
// can try again later (every write here is safe to repeat).
export async function pushChanges(userId, diff, rows) {
  const jobs = []
  if (diff.profile) {
    jobs.push(
      supabase.from('profiles').upsert({
        id: userId,
        settings: rows.profile.settings,
        timer: rows.profile.timer,
        updated_at: new Date().toISOString(),
      }),
    )
  }
  for (const table of TABLES) {
    const { upsert, remove } = diff.tables[table]
    const onConflict = ['user_id', ...KEYS[table]].join(',')
    for (const part of chunks(upsert)) {
      jobs.push(
        supabase.from(table).upsert(
          part.map((r) => ({ ...r, user_id: userId })),
          { onConflict },
        ),
      )
    }
    if (!remove.length) continue
    if (table === 'custom_days') {
      for (const kind of ['done', 'slip']) {
        const dates = remove.filter((r) => r.kind === kind).map((r) => r.date)
        for (const part of chunks(dates)) {
          jobs.push(
            supabase.from(table).delete().eq('user_id', userId).eq('kind', kind).in('date', part),
          )
        }
      }
    } else {
      const key = KEYS[table][0]
      for (const part of chunks(remove.map((r) => r[key]))) {
        jobs.push(supabase.from(table).delete().eq('user_id', userId).in(key, part))
      }
    }
  }
  const results = await Promise.all(jobs)
  const failed = results.find((r) => r.error)
  if (failed) throw failed.error
}
