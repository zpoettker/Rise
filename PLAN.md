# Login Tracker — Plan

Personal morning log-on tracker. Chrome opens the Vercel site on startup; the first visit each weekday is recorded in `localStorage`.

## Rules
- **Hit:** logged on at or before the target time + grace. Anything after is **late**; a past weekday with no log on is **missed**.
- **Tracked days:** weekdays only. Weekends are ignored entirely (not shown as missed, don't break streaks).
- **Target:** one target time for every day, default 8:30 with 15 min grace (both configurable in settings). Changing them re-grades all past days.
- **Login:** first time the page is seen on a given day (on load or when the tab becomes visible). Refreshes don't re-record.
- **Day start:** a new day begins at the day start time (default 4:00 AM, configurable in settings). Visits before it belong to the night before and aren't recorded, and until then the dashboard's "today" is still the previous day (`dayOf`). The day start must be earlier than the target time.

## Design decisions
- Keep the soft sunrise look: cream background, gold/orange `sun-*` scale, Fraunces (headings/numbers) + Nunito (body).
- Hit days are gold, shaded darker the earlier the log-on (`hitLevel`: 8:26–8:45 / 5+ / 15+ / 30+ min early). Late and missed days share one muted tan (`miss`, a deeper shade of the blank `empty` tan; the heatmap uses the slightly darker `miss-dark` since its cells are tiny). No-data days stay blank. No purple.
- Header reads "Good Morning, <name>", with the name set in settings (blank by default → just "Good Morning"), so other people can use the app too.
- Calendar starts on Sunday so the (untracked) weekend sits on the edges; the heatmap shows Mon–Fri only.
- 🔥 shows next to the current streak when it equals the best streak.
- A daily NIV verse widget was tried and removed. Don't re-add unless asked.

## Phases
- [x] **0. Scaffold & deploy:** Vite + React, Tailwind, date-fns, Vitest; GitHub → Vercel auto-deploy; Chrome startup page
- [x] **1. Data layer:** entry/settings shape, versioned `localStorage` module, `recordLoginIfNeeded()`
- [x] **2. Stats engine:** `classifyDay`, current/best streak, average time, hit rate (pure functions, unit tested)
- [x] **3. Design system:** sunrise palette tokens, typography, card styles
- [x] **4. Dashboard:** today hero, stat cards w/ range toggle, custom SVG heatmap
  - [x] Stat cards with 7d/30d/90d/All range toggle
  - [x] Year heatmap (`YearHeatmap.jsx`) with hover tooltips
  - [x] Month calendar (`MonthCalendar.jsx`) with month navigation
  - [x] Hit rate card (`HitRateCard.jsx`) next to the calendar: ring + hit/late/missed counts for the selected range (replaced the temporary style guide)
- [x] **5. Editing & settings:** edit/add/delete past logins, settings panel, JSON export/import
  - [x] Click a calendar day → popup to set/add its login time (`EditLoginDialog.jsx`, `setLoginTime`)
  - [x] Settings panel: gear in the header → `SettingsDialog.jsx` (your name, target time, grace 0–60 min, day start; Reset restores the times only). Saved via `updateSettings`; past days are re-graded with the new settings. Popups share `ui/Dialog.jsx`.
  - [x] JSON export/import backup: "Backup" section at the bottom of the settings popup (`Backup.jsx`). Export downloads `rise-backup-<date>.json` (the saved state + `exportedAt`). Import checks the file (`parseBackup`: valid dates/times, bad settings fall back to defaults), shows a confirm screen, then **replaces** everything. No merge, on purpose: it's for restoring after a cache clear. These buttons act immediately, unlike the settings form's Save.
  - [x] Delete a login: trash icon at the bottom left of the day popup (only when the day has one, no confirm), `deleteLogin`. A deleted past weekday counts as missed.
- [x] **6. Gamification & polish:** hit celebration and high-score moment (badges and first-run setup left out, see Ideas for later)
  - Style: noticeable and rewarding but still calm sunrise. Built around the sun glow, no confetti. Plays **once per day** (last played day stored under `rise:celebrated`, kept out of backups). Starts after the page's fade-in.
  - [x] Hit celebration: the sun flares (and stays a bit brighter), rays swell, two gold halo rings ripple out, a warm dawn wash fades over the top of the page, then "18 min early" rises in. Late days get a calm "12 min late", no celebration. Header also says "Not logged on yet" on an unlogged weekday instead of "Enjoy your weekend".
  - [x] High-score moment (`isNewBestToday`): when today's hit beats the old best streak (2+ days), a gold shimmer sweeps the streak card, the number pops, and a "New best!" pill stays for the day.

## Status (2026-11-15)
v1 (phases 0–6) is complete. **v2 (multi-tracker + backend) is planned below and not started.**

---

# v2 — Morning, Workout, Work (+ All)

Grow Rise from a single morning tracker into three trackers that share one dashboard layout, each with its own colour, plus a combined view. Workouts come in automatically from the Strong app, work hours come from an in-app timer, and data moves from `localStorage` to a backend with a login.

## Target UX
- Under the greeting, the row that holds the range selector becomes `justify-between`: **tracker tabs on the left** (`Morning · Workout · Work · All`, same `SegmentedControl` style) and the range selector stays on the right. Selected tab saved per browser (localStorage convenience only).
- Each tracker tab has **the same layout as Morning today**: hero line under the greeting, 3 stat cards, year heatmap, month calendar + hit rate card. Only the accent colour and the meaning of a "hit" change.
  - **Morning:** orange/gold (current `sun-*`).
  - **Workout:** blue accents.
  - **Work:** green accents.
  - **All:** combined view using all three colours.
- Neutrals (cream background, ink, tan `empty`/`miss`) stay shared so the app still feels like one thing.

## What a "hit" means per tracker (decided 2026-11-15)
| | Morning | Workout | Work |
|---|---|---|---|
| Tracked days | Mon–Fri, weekends optional (setting) | Every day | Mon–Fri, weekends optional (setting) |
| Day hit | logged on ≤ target + grace | ≥1 workout that day | ≥ daily hour goal (setting, default 6h) |
| Late / partial | after target | n/a | some time, under goal |
| Missed | no log-on | rest day (not a failure on its own) | no time logged |
| Streak unit | days | **weeks**: a week (Mon–Sun) is hit when workouts ≥ weekly goal (setting, default 3) | days |
| Heatmap / calendar shade | how early | workout length | hours worked |
| Stat cards | streak · best · avg log-on | week streak · best · this week (2/3) | streak · best · avg hours/day |
| Extra widget | – | bar chart of workouts per week vs. goal line (in place of or next to the hit rate card) | – |

- **Weekend toggle** (Morning and Work, separate settings, default off): when on, Sat/Sun are tracked days (count for streaks and hit rate, shown in the heatmap); when off they behave as today (ignored, not missed). Morning doesn't have this yet; `recordLoginIfNeeded` and `getDays` currently hard-code `isWeekend`.
- The current week in progress never breaks the workout streak (like today's `pending`).
- **Work tracking is timer-only for input** (start/stop), with manual edit of sessions for corrections.

## Architecture decision
- **Backend: Supabase** (Postgres + Auth + row-level security, free tier). The React app talks to it directly with `supabase-js`; RLS (`user_id = auth.uid()`) keeps rows private. Fits the existing Vercel deploy with no server to run.
- **One Vercel serverless function** (`/api/ingest/workout`) for the iPhone Shortcut, authenticated with a personal **API token** (generated in settings, stored hashed). The Shortcut can't do an interactive login, so it needs its own credential.
- **Login:** Supabase magic link (email) **and** Google (both offered on the sign-in screen). Sessions persist via refresh tokens, so the Chrome startup tab stays logged in and the morning log-on keeps recording automatically.
- **Day keys stay local:** the client (or Shortcut) sends local `yyyy-MM-dd` + `HH:mm`, never derives the day on the server, so time zones and the 4 AM day start work as today.
- Alternatives considered: Vercel Functions + Neon + Auth.js (more glue code, no built-in RLS); Firebase (non-relational, awkward for stats queries).

#- **Multi-user:** open sign-ups, anyone can create an account. Every row is scoped by RLS; settings live per user in `profiles`; the API token/Shortcut setup must be self-serve (shared iCloud Shortcut link + in-app instructions). New accounts get a first-run setup (name, target time, which trackers, weekly/daily goals) — pulls the "First-run setup" idea forward.

### Draft schema
- `profiles` — `user_id`, `name`, `settings jsonb` (target, grace, day start, work goal, enabled trackers later).
- `wake_logs` — `user_id`, `date`, `time`, `edited`. Unique `(user_id, date)`.
- `workouts` — `id`, `user_id`, `date`, `started_at`, `ended_at`, `duration_min`, `title`, `source` (`health` | `strong_csv` | `manual`), `external_id` (dedupe), `details jsonb` (exercises/sets when available). Unique `(user_id, source, external_id)`.
- `work_sessions` — `id`, `user_id`, `date`, `started_at`, `ended_at` (null = timer running), `note`.
- `api_tokens` — `id`, `user_id`, `token_hash`, `label`, `last_used_at`.

## Getting Strong workouts in
Strong has no public API. Options, best first:
1. **Strong → Apple Health → iOS Shortcut → our API (recommended, automatic).** Turn on Strong's Apple Health sync. A Shortcut runs as a Personal Automation (trigger: *when Strong is closed*, and/or a daily time), runs *Find Health Samples → Workouts* for today, and POSTs start/end/duration/type to `/api/ingest/workout` with the API token. Dedupe on start time so repeat runs are harmless. Health only carries the summary (time, duration, calories), not sets/reps.
2. **Strong CSV export → Shortcut (manual, detailed).** Strong → Settings → Export data → share the CSV to a "Send to Rise" Shortcut, which uploads it; the server parses exercises/sets into `details` and merges with Health rows by start time. Good for an occasional backfill / detail fill-in.
3. **Unofficial Strong API (e.g. a community Rust/Python syncer).** Most detailed and fully automatic, but reverse-engineered: can break at any time, needs your Strong password stored on a server, and may be against Strong's ToS. Not recommended unless 1+2 fall short.

**Stage 0 finding (2026-11-15):** Strong → Apple Health works (workouts show with start time + duration), but **Shortcuts' Find Health Samples has no Workouts type** (list goes Water → Weight → … → Zinc), so option 1 as written is out. Replacement options:
- **1b. Health Auto Export (third-party iOS app, paid tier) → our API.** Reads workouts from HealthKit and POSTs JSON to a REST URL on a schedule/in the background, with a custom header for our API token. Automatic, and other users can set it up themselves. Costs the user money and depends on a third-party app.
- **2. Strong CSV export → Shortcut upload** (above): free, works for everyone, has sets/reps, but you tap to send it.
- Manual add in the app always works as a fallback.
- Tried: Active Energy as a proxy (Shortcuts can read Active Energy). Dead end: Strong attaches calories to the workout itself ("Related Samples: 99.9 cal" opens to "No Data"; newest Active Energy entry in Health is from 2023). Strong's "reset historic workouts" note only recalculates the workout's total, it doesn't create samples. **Shortcuts cannot see Strong workouts at all.**
- Also possible but heavy: a small native iOS companion app reading HealthKit (needs a Mac + Xcode + $99/yr Apple developer account for other users).
- **Found (2026-11-16): the free "Actions" app by Sindre Sorhus** (https://sindresorhus.com/actions, iOS 26+, no ads/IAP) adds a **Find Workout** Shortcuts action that reads workouts from Health (type, duration, source, calories…). **Confirmed 2026-11-16:** it returns the Strong workout from Health with start and end date/time. → **Option 1 is back on: Strong → Health → Shortcut (Actions "Find Workout") → `/api/ingest/workout`.** Automation confirmed; no source field needed.
- Unofficial Rust syncer `tolik518/strong-api-workout-sync`: logs in with the Strong username/password, polls a hidden Strong backend URL (not published in the repo), full set detail, no license, 9 stars. Free and automatic but needs each user's Strong password on our server and can break anytime → not for a multi-user app.
Leaning: build the ingest endpoint to accept both (Health Auto Export JSON + Strong CSV), so each user picks. Pending Zach's call.

**Risk to check first (Stage 0):** confirm on the iPhone that Shortcuts can read Strong's workouts from Health and that the "app closed" automation runs without a confirmation prompt.

## Stages

- [x] **Stage 0 — Phone spike (done 2026-11-16).** Result: Strong → Health works; Shortcuts' built-in Health action can't read workouts, but the free Actions app's **Find Workout** can (start + end date/time; no usable source field, so the Shortcut sends all workouts); the "Strong → Is Closed" automation runs when leaving the app. Sample Strong CSV deferred to Stage 4. (no code, ~30 min, can run alongside Stage 1).**
  - Enable Strong → Apple Health. Log/finish a workout.
  - Build a test Shortcut: Find Health Samples (Workouts, today) → show result. Check which fields come through (start, end, duration, type, source name "Strong").
  - Try a Personal Automation "When Strong is closed" → run that Shortcut, with "Run immediately" on.
  - Export a Strong CSV once and keep it as a sample for Stage 4.
  - Outcome: decide option 1 vs. 1+2, lock the `workouts` payload shape.

- [x] **Stage 1 — Tracker tabs + theming (frontend only, still localStorage).** Built on branch `v2-stage-1` (2026-11-16), awaiting Zach's review before merging to `main`.
  - As built: `lib/trackers.js` holds one config per tracker (days, describe, legend, summary → cards/ring/headline); `lib/workouts.js` (week-based streak, distinct workout days per Mon–Sun week), `lib/work.js` (daily goal, `partial` = some time under goal), `lib/spans.js` (shared `{ id, start, end }` helpers; a span belongs to `dayOf(start)`). State is v2: `workouts: []`, `workSessions: []`, new settings `morningWeekends`, `workoutWeeklyGoal` (3), `workGoalMinutes` (360), `workWeekends`; backups round-trip them and v1 backups still import. Theme: `@theme static` + `accent-*` tokens swapped by `<html data-tracker>` (`hooks/useTrackerTab.js`, tab remembered in `rise:tab`); the page glow follows the accent. Morning celebrations only play on the Morning tab. Tabs are grey icons (sun, Strong-style dumbbell, laptop; `components/ui/TrackerIcons.jsx`) with "All" as text. The animated sun is Morning-only; Workout/Work show their icon large in the accent colour with a soft glow, All shows the three icons together. All has its own red theme (`ember-*` scale, `data-tracker='all'`); morning parts inside it stay gold via an explicit `[data-tracker='morning']` rule. All tab is a placeholder (three streak cards + three headline lines). Only Morning days are editable; Workout/Work calendar days show tooltips.
  - Accent tokens: add `--color-sea-*` (blue) and `--color-leaf-*` (green) 50–900 scales next to `sun-*`. Introduce semantic `--color-accent-50…900` that default to `sun-*` and are swapped by a `data-tracker="workout|work"` wrapper. Replace hard-coded `sun-*` in shared components (`SegmentedControl`, `Card`, charts, `Sun`, celebration) with `accent-*` (~33 usages).
  - Tracker abstraction: a `trackers/` module where each tracker defines `{ id, label, color, isTrackedDay, classifyDay(dateKey) → {status, level, detail}, statCards }`. Generalize `stats.js` (`getDays`, `streaks`, `getStats`) to take a tracker instead of reading `state.entries` + morning rules directly. Morning becomes the first tracker; existing tests keep passing.
  - Tabs on the left of the range row; selected tab changes the accent + the data shown. Workout/Work show the full layout with an empty state until they have data. "All" is a placeholder.
  - Morning weekend toggle: `includeWeekends` setting (default false) used by `recordLoginIfNeeded`, `getDays` and the heatmap (Mon–Fri vs. full week rows); checkbox in the settings dialog; `parseBackup` accepts it.
  - Demo mode (`/?demo`) generates fake data for all three trackers so the colours can be reviewed.
  - Done when: Morning looks identical to today; switching tabs re-themes everything; tests pass.

- [ ] **Stage 2 — Backend + login + migrate morning data.**
  - Create Supabase project; SQL migration file in repo (`supabase/migrations/`) with the schema + RLS policies.
  - `src/lib/api.js` data layer replacing `storage.js` (load profile + logs, upsert, delete). Keep the pure functions in `logins.js`/`stats.js` unchanged; only the persistence moves.
  - Login screen with magic link and Google, sign-out in settings. Open sign-ups; first-run setup for new accounts (name, target, goals, restore-from-backup shortcut). Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in Vercel.
  - Morning recording: same `recordLoginIfNeeded` logic on load/visibility, written to `wake_logs`. If offline or the write fails, queue it in localStorage and retry so a morning is never lost.
  - One-time migration: on first login, if `rise:data` exists in localStorage, offer "Upload your existing data"; the JSON backup import also writes to the backend. Export keeps working (now includes all trackers).
  - Demo mode stays fully local (no backend).
  - Done when: the production URL records the morning log-on into Supabase, existing history is migrated, and a second browser shows the same data after login.

- [ ] **Stage 3 — Work timer (green).**
  - Work tab hero: big Start / Stop button + running clock (`3:42:10 today`). A running session is a `work_sessions` row with `ended_at = null`, so it survives closing the tab and shows on any device. Optional pause = stop + start.
  - Guard rails: warn on a session running > 12h; stop at the day boundary if still running (split across days).
  - Click a calendar day → dialog listing that day's sessions; add/edit/delete manually.
  - Stats per the table above; settings gain a daily hour goal and a Work weekend toggle.
  - Done when: a day of real timing shows correctly on the green dashboard.

- [ ] **Stage 4 — Workouts from Strong (blue).**
  - `/api/ingest/workout` (Vercel function): verify bearer token → upsert workouts (dedupe on `source + external_id`/start time). Optional `/api/ingest/strong-csv` that parses Strong's CSV into `details`.
  - Shortcut design (send each workout once): automation "Strong → Is Closed → Run Immediately", "Notify When Run" off, plus an optional nightly backup automation. The Shortcut keeps a `rise-last-sent.txt` (end date of the last workout sent) in Shortcuts' iCloud folder; it runs Find Workout, keeps only workouts that ended after that date, and **stops without any network call if there are none**. Otherwise it POSTs them, and on success saves the newest end date. Closing Strong mid-workout sends nothing (unfinished workouts aren't in Health). Server still dedupes as a safety net.
  - Settings: "Connect iPhone" section — generate/revoke API token, show the endpoint URL, and step-by-step Shortcut instructions (or a shared iCloud Shortcut link).
  - Workout tab: week-based streak (weekly goal setting, default 3), per-week bar chart with goal line, heatmap/calendar shaded by duration; calendar day dialog lists workouts (title, duration, and exercises when CSV detail exists); manual add/delete for missed syncs.
  - Done when: finishing a workout in Strong shows up in Rise without touching the computer.

- [ ] **Stage 5 — "All" combined view.**
  - Hero: today at a glance — woke at 7:58 ☀️ · lifted 52 min 💪 · worked 3h 40m 🌿.
  - Stat cards: each tracker's current streak in its colour, plus a "perfect days" streak (every tracked tracker hit).
  - Year heatmap: each day cell split into 3 thin stripes (gold/blue/green) or a combined score shade; month calendar days get three coloured dots. Hit rate card becomes three concentric rings.
  - Done when: All reads at a glance and links (click) to each tracker's tab.

- [ ] **Stage 6 — Tracker settings + polish (later, per your note).**
  - Settings: toggle which trackers are enabled; disabled ones disappear from the tabs and All.
  - Per-tracker celebrations (blue/green versions of the sun flare), greeting adapts by tab/time of day.
  - Update README (new features, backend setup, Shortcut guide) and this plan.

## Decisions (2026-11-15)
- Workout: weekly-goal streak, keep heatmap + calendar, add a per-week bar chart.
- Work: daily hour goal, input via start/stop timer, weekend toggle.
- Morning: gets the same weekend toggle.
- Login: magic link and Google.
- Multi-user: open sign-ups.

## Ideas for later (not planned)
- **Streak badges:** gold medallions for 5 / 10 / 20 / 50 days in a row and a 100% hit-rate month, in a row under the stat cards; unearned ones as faint tan outlines.
- **First-run setup:** welcome card when there's no data (first visit or after a cache clear) to set target, grace and day start, with a "Restore from backup" shortcut.
- **"Edited" marker** on hand-edited days (entries already store `edited: true`).

## Dev notes
- `npm run dev`, then open `/?demo` to preview with ~8 months of fake data for all three trackers (dev only, never saved).
- `/?demo&celebrate` (or `/?celebrate` on real data) replays the hit celebration and new-best moment on every load (dev only).
- `npm run test` (Vitest), `npm run lint`, `npm run build`.
- Data lives in `localStorage` under `rise:data`. Settings saved there override the defaults in `logins.js`; change them from the gear in the header.

## Deployment
- GitHub repo `zpoettker/Rise` (formerly `login-tracker`); Vercel auto-deploys every push to `main`, and builds a preview for other branches.
- Use the Vercel project's **production domain** (Vercel → Domains) as the Chrome startup page, not a per-deployment URL like `login-tracker-<hash>-zpoettkers-projects.vercel.app`, which is frozen to one build.
- `login-tracker.vercel.app` belongs to someone else.
- Production domain: https://login-tracker-olive.vercel.app/ (use this as the Chrome startup page)
- `localStorage` is per domain: log-ons recorded on an old per-deployment URL don't carry over to the production domain. Re-enter them via the calendar (Zach doesn't need the old URL's data).
