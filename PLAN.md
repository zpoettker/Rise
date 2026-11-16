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

## Status (2026-11-16)
v1 (phases 0–6) is complete. **v2 (multi-tracker + backend) is in progress: Stages 0–1 done (branch `v2-stage-1`), Stage 2 next.**

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

- **Multi-user:** open sign-ups, anyone can create an account. Every row is scoped by RLS; settings live per user in `profiles`; the API token/Shortcut setup must be self-serve (shared iCloud Shortcut link + in-app instructions). New accounts get a first-run setup (name, target time, which trackers, weekly/daily goals) — pulls the "First-run setup" idea forward.

### Draft schema
- `profiles` — `user_id`, `name`, `settings jsonb` (target, grace, day start, work goal, enabled trackers later).
- `wake_logs` — `user_id`, `date`, `time`, `edited`. Unique `(user_id, date)`.
- `workouts` — `id`, `user_id`, `date`, `started_at`, `ended_at`, `duration_min`, `title`, `source` (`health` | `strong_csv` | `manual`), `external_id` (dedupe), `details jsonb` (exercises/sets when available). Unique `(user_id, source, external_id)`.
- `work_sessions` — `id`, `user_id`, `date`, `started_at`, `ended_at` (null = timer running), `note`.
- `api_tokens` — `id`, `user_id`, `token_hash`, `label`, `last_used_at`.

## Getting Strong workouts in (decided 2026-11-16)
Strong has no public API or webhook. **Chosen route: Strong → Apple Health → iOS Shortcut → `/api/ingest/workout`.**
- Strong writes each finished workout to Apple Health (Strong → Settings → Apple Health). Health only has the summary: start, end, duration, calories. No sets/reps.
- Apple's built-in Shortcuts Health action (**Find Health Samples**) **cannot read workouts** (no Workouts type), so the Shortcut uses the **Find Workout** action from the free **Actions** app by Sindre Sorhus (https://sindresorhus.com/actions, iOS 26+, no ads/IAP). Confirmed on Zach's iPhone: it returns Strong workouts with start and end date/time. It shows no usable source/app field, so the Shortcut sends all workouts in Health.
- Trigger: Personal Automation **App → Strong → Is Closed → Run Immediately**, "Notify When Run" off. "Is Closed" fires whenever you leave Strong (home, app switch, lock), not only on force-quit; confirmed it runs. Optional nightly backup automation. Send-once design is in Stage 4.
- Each user sets this up themselves (needs Strong, the Actions app, our shared Shortcut and their Rise API token), so it works for a multi-user app.
- **Past workouts:** a one-time **Strong CSV export** import (has exercises/sets too). Sample CSV still to be provided by Zach (Strong → Settings → Export Strong Data).

Rejected / fallback options:
- **Active Energy as a proxy:** dead end. Strong stores calories inside the workout ("Related Samples: 99.9 cal" opens to "No Data"; no Active Energy entries from Strong), and Strong's "reset historic workouts" only recalculates that total.
- **Health Auto Export** (iOS app): automatic REST push of workouts, but the REST feature is a paid tier. Possible later add-on; the ingest endpoint should stay generic enough to accept it.
- **Strong CSV via Shortcut** as the main route: free and detailed but manual (tap to send). Kept for history import only.
- **Unofficial Strong API** (e.g. Rust `tolik518/strong-api-workout-sync`): needs each user's Strong password and a hidden backend URL, can break anytime, possible ToS issue. Not for a multi-user app.
- **Native iOS companion app reading HealthKit:** works, but needs a Mac, Xcode and a $99/yr Apple developer account. Not worth it.
- Manual add/delete in Rise is always available as a fallback.

## Stages

- [x] **Stage 0 — Phone spike (done 2026-11-16).** Proved the iPhone side works before writing code: Strong → Health works; the Actions app's Find Workout reads workouts (start + end); the "Strong → Is Closed" automation runs. Details in "Getting Strong workouts in" above. Strong CSV sample deferred to Stage 4.

- [x] **Stage 1 — Tracker tabs + theming (frontend only, still localStorage).** Done 2026-11-16, committed and pushed to branch `v2-stage-1` (not merged to `main`, so the live site is unchanged).
  - Tabs: grey icons left of the range selector (sun = Morning, Strong-style dumbbell = Workout, laptop = Work; `components/ui/TrackerIcons.jsx`) and "All" as text. Selected tab remembered per browser (`rise:tab`).
  - Theme: each tab recolours the page (buttons, heatmap, calendar, ring, top glow): Morning gold (`sun-*`), Workout blue (`sea-*`), Work green (`leaf-*`), All red (`ember-*`). Done with `accent-*` tokens (`@theme static`) re-pointed by `<html data-tracker>` (`hooks/useTrackerTab.js`); an explicit `[data-tracker='morning']` rule keeps morning parts gold inside other themes.
  - Header: the animated sun only on Morning; Workout/Work show their icon large in the tab colour with a soft glow; All shows the three icons together. Morning celebrations only play on the Morning tab.
  - Logic: `lib/trackers.js` has one config per tracker (days, tooltip text, legend, stat cards, ring, headline) so the charts are shared. `lib/workouts.js`: weekly-goal streak (distinct workout days per Mon–Sun week, default goal 3, current week never breaks it), heatmap shaded by length, no-workout days are rest days. `lib/work.js`: daily goal (default 6h), `partial` = some time under goal (tan). `lib/spans.js`: shared helpers for `{ id, start, end }` spans; a span belongs to `dayOf(start)`.
  - Morning "Track weekends" setting (`morningWeekends`, default off) in the settings popup.
  - State v2: `workouts: []`, `workSessions: []`, settings `morningWeekends`, `workoutWeeklyGoal`, `workGoalMinutes`, `workWeekends`. Backups round-trip them; v1 backups still import.
  - All tab is a placeholder: three headline lines and three streak cards in their own colours (click opens the tab).
  - Only Morning calendar days are editable for now; Workout/Work days show tooltips.
  - `/?demo` fills all three trackers. Tests: 56 passing.

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

## Open items
- Merge `v2-stage-1` into `main` when Zach is happy with it (or keep stacking stages on the branch).
- At phone width the settings gear in the header is partly cut off on the right (header layout predates v2). Small fix, not done yet.
- `package-lock.json` had an uncommitted change before v2 started; left out of the Stage 1 commit on purpose.
- Zach plans to move development from the Codespace to his laptop (clone into Desktop › Everything › Projects, branch `v2-stage-1`).

## Decisions (2026-11-15)
- Workout: weekly-goal streak, keep heatmap + calendar, add a per-week bar chart.
- Work: daily hour goal, input via start/stop timer, weekend toggle.
- Morning: gets the same weekend toggle.
- Login: magic link and Google.
- Multi-user: open sign-ups.
- Workouts come in via Strong → Health → Shortcut with the free Actions app's Find Workout (2026-11-16).
- Look: tabs are icons; each tracker has its own colour (gold / blue / green / red for All); the sun is Morning-only (2026-11-16).

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
