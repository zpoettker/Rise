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

## Status (2026-11-18)
v1 (phases 0–6) is complete. **v2 (multi-tracker + backend) is in progress on branch `v2-stage-1`: Stages 0–1 done; Stage 2 (UI design pass) underway.** Morning done; Workout tab done for now (weight chart added); **Work tab in progress**: Focus timer, goal history, hours-shaded heatmap/calendar with goal dots, hours vs. goal bar chart, new top cards, More stats and the castle builder, the weekly timeline and the week edit popup (blocks + week goal) are in. **Next up (suggested):** bigger icons and celebrations, then the All tab (see Stage 2 → Work tab). Stages were reordered on 2026-11-16: UI → work timer → backend → settings → Strong.

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
| Heatmap / calendar shade | how early | week vs. weekly goal (under / on / over) | hours worked |
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
- `weights` — `id`, `user_id`, `date`, `measured_at`, `kg` (stored in kg, shown in the user's unit), `source` (`health` | `manual`), `external_id` (dedupe). Unique `(user_id, source, external_id)`.

## Getting Strong workouts in (decided 2026-11-16)
Strong has no public API or webhook. **Chosen route: Strong → Apple Health → iOS Shortcut → `/api/ingest/workout`.**
- Strong writes each finished workout to Apple Health (Strong → Settings → Apple Health). Health only has the summary: start, end, duration, calories. No sets/reps.
- Apple's built-in Shortcuts Health action (**Find Health Samples**) **cannot read workouts** (no Workouts type), so the Shortcut uses the **Find Workout** action from the free **Actions** app by Sindre Sorhus (https://sindresorhus.com/actions, iOS 26+, no ads/IAP). Confirmed on Zach's iPhone: it returns Strong workouts with start and end date/time. It shows no usable source/app field, so the Shortcut sends all workouts in Health.
- Trigger: Personal Automation **App → Strong → Is Closed → Run Immediately**, "Notify When Run" off. "Is Closed" fires whenever you leave Strong (home, app switch, lock), not only on force-quit; confirmed it runs. Optional nightly backup automation. Send-once design is in Stage 6.
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

- [x] **Stage 0 — Phone spike (done 2026-11-16).** Proved the iPhone side works before writing code: Strong → Health works; the Actions app's Find Workout reads workouts (start + end); the "Strong → Is Closed" automation runs. Details in "Getting Strong workouts in" above. Strong CSV sample deferred to Stage 6.

- [x] **Stage 1 — Tracker tabs + theming (frontend only, still localStorage).** Done 2026-11-16, committed and pushed to branch `v2-stage-1` (not merged to `main`, so the live site is unchanged).
  - Tabs: grey icons left of the range selector (sun = Morning, Strong-style dumbbell = Workout, laptop = Work; `components/ui/TrackerIcons.jsx`) and "All" as text. Selected tab remembered per browser (`rise:tab`).
  - Theme: each tab recolours the page (buttons, heatmap, calendar, ring, top glow): Morning gold (`sun-*`), Workout blue (`sea-*`), Work green (`leaf-*`, retuned 2026-11-16 to a leaf green halfway between vivid green and olive; GitHub's greens and a full olive were tried and dropped), All red (`ember-*`). Done with `accent-*` tokens (`@theme static`) re-pointed by `<html data-tracker>` (`hooks/useTrackerTab.js`); an explicit `[data-tracker='morning']` rule keeps morning parts gold inside other themes.
  - Header: the animated sun only on Morning; Workout/Work show their icon large in the tab colour with a soft glow; All shows the three icons together. Morning celebrations only play on the Morning tab.
  - Logic: `lib/trackers.js` has one config per tracker (days, tooltip text, legend, stat cards, ring, headline) so the charts are shared. `lib/workouts.js`: weekly-goal streak (distinct workout days per Mon–Sun week, default goal 3, current week never breaks it), heatmap shaded by length, no-workout days are rest days. `lib/work.js`: daily goal (default 6h), `partial` = some time under goal (tan). `lib/spans.js`: shared helpers for `{ id, start, end }` spans; a span belongs to `dayOf(start)`.
  - Morning "Track weekends" setting (`morningWeekends`, default off) in the settings popup.
  - State v2: `workouts: []`, `workSessions: []`, settings `morningWeekends`, `workoutWeeklyGoal`, `workGoalMinutes`, `workWeekends`. Backups round-trip them; v1 backups still import.
  - All tab is a placeholder: three headline lines and three streak cards in their own colours (click opens the tab).
  - Only Morning calendar days are editable for now; Workout/Work days show tooltips.
  - `/?demo` fills all three trackers. Tests: 56 passing.

Stages 2–3 stay frontend-only on `localStorage` (with `/?demo` for previewing). The backend arrives in Stage 4 and takes over persistence for all three trackers at once.

- [ ] **Stage 2 — UI design pass (frontend only, localStorage).** Get every tab looking the way Zach wants before wiring in more functionality. The list grows as Zach gives direction; `/?demo` is the main preview.
  - **Progress (2026-11-16):** Morning is done as is. Workout tab is done for now (details below). **Work tab is next.**
  - **Zach's design changes, still to do:**
    - [x] Workout and Work header icons 20% bigger (2026-11-24): `size-16` → `size-19` in `HeaderIcon` (App). The sun stays as is; tab-bar icons unchanged.
    - [x] Slide between tabs (2026-11-24, `ui/SegmentedControl.jsx`, so the range selector too): the coloured pill glides from option to option (springy 300ms, positioned from the selected button and kept in place by a ResizeObserver; no glide on first paint). Besides clicking, press and slide across the options and each one is picked as the pointer passes over it (pointer capture, so it keeps tracking off the control; `touch-pan-y` so a vertical swipe still scrolls on a phone).
    - [-] **Dropped (2026-11-24).** Animate the header icon when switching to a tab (e.g. the dumbbell lifts/bounces, the laptop opens or its screen lights up, the sun rises). Plays once per switch, calm like the existing celebrations, off with reduced motion.
  - **"All" combined view** (replaces the Stage 1 placeholder):
    - Hero: today at a glance, e.g. woke at 7:58 ☀️ · lifted 52 min 💪 · worked 3h 40m 🌿.
    - Stat cards: each tracker's current streak in its own colour, plus a "perfect days" streak (every tracked tracker hit that day).
    - Year heatmap: each day cell split into 3 thin stripes (gold/blue/green) or one combined score shade. Month calendar days get three coloured dots. Hit rate card becomes three concentric rings.
    - Clicking a tracker's part opens that tab.
  - **Workout tab:**
    - [x] Stat cards: current streak · best streak · total workouts (all time).
    - [x] "Workouts per week" bar chart (`WeeklyBarsCard.jsx`) replaces the hit-rate ring next to the calendar. Workout days per Mon–Sun week for the selected range. Weeks that reach the goal are solid blue and the rest are light blue. The goal line follows `workoutWeeklyGoal`. Hover a bar for its week's details. Footer: on goal · short · workouts. The hovered bar turns a shade darker.
    - [x] Heatmap and calendar shade each workout day by **its week against the goal** instead of by length (workout time isn't reliable): light = under goal, medium = on goal, dark = over goal (`weekLevel` in `lib/workouts.js`; levels 1 / 3 / 5, where 5 is an extra `accent-600` step). Legend reads Under goal · On goal · Over goal. Tooltips add "week 2/3". The bar chart is unchanged. This week's days start light and darken as the week fills up.
    - [x] Header changes with this week's progress instead of "Good Morning" (tracker `heading`): no workouts yet → "Let's Lift", some but under the goal → "Keep It Up", goal or more → "Goal Crushed!". (Tried "You have logged X workouts" first; too long.)
    - [x] Calendar starts on Monday (tracker `weekStartsOn: 1`; Morning and Work keep Sunday). Footer: workout days · total time (a "% of weeks on goal" footer was tried and reverted).
    - [x] "This week" progress card (`WeekProgressCard.jsx`), full width under the stat cards: date range, Mon–Sun dots (worked / rest / coming up, today ringed), "4 / 3 workout days", status ("2 more to go · 4 days left" or "Goal crushed · 1 extra") with the week's total time, and a progress bar with one slot per goal day, growing to one per workout day when over (4/3 → 4 slots, all full), darker once met. Under the goal the fill is plain blue (`.bar-in`, grows in on load). **Once the goal is met** it becomes the animated "energy" fill (`.energy` in `index.css`, uses accent tokens so other tabs can reuse it): big right-pointing chevrons (20px bands) in three shades (`accent-400/500/600`) marching right, with a soft static glow. Earlier versions with flowing gradients, rolling wave arcs, a light surge and a glowing spark were tried and simplified away (too busy). Turned off with reduced motion. Data from `getWorkoutWeek`. The line under the heading now says when the last workout was ("Worked out today · 52m", "Last workout yesterday / on Thursday / on Oct 3") instead of the weekly count.
    - [x] Order: stat cards → This Week → calendar + bar chart → year heatmap last (tracker `heatmapLast`), so the calendar/graph show without scrolling. Chosen over a "version A" with a compact one-row This Week card and the heatmap above the calendar (2026-11-16).
  - [x] **All tabs:** heatmap weekday labels (Mon/Wed/Fri/Sun) stay pinned on the left when the heatmap scrolls sideways.
    - [-] **Dropped (2026-11-24).** **Lifetime workouts milestone** card (moved here from the Work ideas, 2026-11-16): a progress bar toward the next milestone, e.g. "114 / 150 workouts", with milestones like 25, 50, 100, 150, 250, 500, 1,000. Crossing one plays a small celebration. Always moves forward, even in slow weeks.
    - [x] **Weight chart** card (`WeightCard.jsx`, logic in `lib/weights.js`, built 2026-11-18), full width between the calendar/bar chart row and the heatmap: latest weight big, change from the range's first weigh-in to the latest ("↓ 10.9 lb in 238 days") and "4.5 lb to goal" (from the latest weigh-in). Custom SVG line chart sized to its card: a line joining each weigh-in to the next (no averaging, decided 2026-11-18) with a soft fill under it and a dot on each weigh-in (smaller, ringless dots when they're packed tight, e.g. All), an optional dashed goal line, round-number y axis on the right, 5 date labels. Follows the 7d / 30d / 90d / All range. Hover shows the nearest weigh-in ("Thu, Nov 12 · 6:44 AM · 182.3 lb"); click it to edit or delete. "+ Add weigh-in" popup (weight, date, time; starts from the last weight) and "Set goal" popup (lb / kg toggle that converts what's typed, optional goal weight) in `WeightDialogs.jsx`. State: `weights: [{ id, at: 'yyyy-MM-ddTHH:mm', kg }]` stored in kg at full precision; settings `weightUnit` ('lb' default) and `weightGoalKg` (null = no goal). Backups round-trip them and reject weights outside 20–400 kg. `/?demo` adds ~8 months of weigh-ins (194 → ~182 lb). Tests in `lib/weights.test.js`. The smart scale feeds it in Stage 6.
    - [x] **Workout day popup** (2026-11-24, `WorkoutDayDialog.jsx`, like Morning's log-on popup): click a Workout calendar day or a past/today dot on the This Week card. Lists the day's workouts as start – end time rows (length on the right) that can be changed inline or removed with the trash icon; "+ Add workout" adds a row (1h, after the last one; on today with nothing logged it ends now; else 6–7 PM). A day with no workouts opens with one row ready ("Add workout"); removing every row shows "No workouts · rest day". Footer "2 workouts · 1h 25m"; overlapping rows are outlined red with "Workouts overlap" and Save is disabled. Nothing is saved until Save. Times before the day start (e.g. 1 AM) belong to the night after, and an end before the start runs past midnight (`placeWorkout`). Helpers `workoutsOn`, `overlappingWorkouts`, `setDayWorkouts` in `lib/workouts.js` (tested). New `medium` width on `ui/Dialog.jsx`.
    - [ ] More Workout cards/stats: maybe later.
  - **Work tab:** in progress. Purpose: track and grow daily hours of deep work, ramping the goal from ~2h toward 8–10h, so the visuals show improvement over time, not only goal hits. The Focus timer card (Stage 3 below) went in first, built together with its design.
    - [x] Heading changes with today (`workHeading`): goal reached → "Brick by Brick"; timer running → "Flow State"; 30 min or more logged → "In the Zone"; less → "Time to Build".
    - [x] Green retuned to a fresh leaf green (halfway between vivid green and olive). Timer presets 15m / 25m / 30m / 45m / 1h.
    - [x] **Goal history** (built 2026-11-18): settings `workGoals: [{ from: 'yyyy-MM-dd', minutes }]` replaces `workGoalMinutes`. Each day is graded against the goal in effect that day (`goalOn`; the first entry also covers everything before it), so raising the goal never turns old met days into misses; work days carry their `goal`, and streaks, hit rate, tooltips, headings and the Today bar all use each day's own goal. "Change goal" link on the Today bar opens `WorkGoalDialog.jsx`: new goal in hours (0.25 steps, 15 min – 16 h), starts **next Monday** (default, `nextGoalWeek`; even on a Monday it's the following one) or **today**, plus the last 5 changes ("From the start", dates, "upcoming"). A change on the same start date replaces the earlier one (`setWorkGoal`). Saved data and backups with the old single goal turn it into the first entry (`readWorkGoals`). `/?demo` ramps the goal from 2h to 8h, raised every 4 weeks (2h → 2h 30m → 3h → 4h → 4h 30m → 5h 30m → 6h → 7h → 8h), with daily hours swinging between about 45% and 150% of that day's goal (and the odd day off), so the charts climb with it. The goal popup lives on the Work tab for now; it moves into the per-tracker settings in Stage 5.
    - [-] **Dropped (2026-11-24).** **Edit past goals**: mostly covered by the week goal in the edit popup (open any past week and change its goal). Still possible later: a settings list to remove a goal entry outright.
    - [x] **Top cards** (2026-11-18): **Today's work** (green, "of 8h goal", counts a running timer live; App ticks every second while the timer runs and passes `now` to the summary) · **Current goal** ("Since Nov 2" under it, from `goalEntryOn`; "Your starting goal" before the goal was ever changed; the year is added if it's not this year) · **Longest day** (all-time best with its date, or "Today"; when today beats it, a "New record!" pill and 🔥). Streaks were dropped from the top because they reward keeping the goal low; data from `getWorkRecords`.
    - [x] **More stats** card at the bottom of the Work tab (`MoreStatsCard` in App): current streak · best streak (days in a row on goal) · longest block (one session, with date) · this week · avg work day (selected range) · all time.
    - [x] **Heatmap + calendar shaded by hours worked** (built 2026-11-18): every day with work gets a shade from its total hours, met goal or not (`workLevel`: under 2h / 2–4h / 4–6h / 6–8h / 8h+, levels 1–5), so the charts darken as the hours grow; days with no work stay tan. Calendar days that met that day's goal get a small dark **dot badge** on the top-right of the circle (tracker `marksGoal`; a dot instead of a ring so it doesn't clash with today's ring). Legend: "No work · Fewer hours ▢▢▢▢▢ More"; calendar footer "● 8 goal met · 4 short · 83h total"; tooltips "6h 40m · goal 6h · goal met".
    - [x] **Hours vs. goal bar chart** (`HoursBarsCard.jsx`, data from `getHoursBars`, built 2026-11-18) replaces the hit-rate ring next to the calendar, styled like Workout's weekly chart: one bar per tracked day of hours worked, solid when that day's goal was met, light when under, a small stub for no work; the goal is a **step line** behind the bars that rises wherever the goal was raised. 7d / 30d show days (weekday names at 7d); **90d / All show the daily average per Mon–Sun week** ("Avg hours per day, by week"; an empty today is left out of the average). Y axis in hours with the current goal in bold. Hover highlights a bar: "Wed, Nov 18 · 5h 20m · goal 6h · goal met" or "Week of Nov 9 · avg 6h 10m a day · goal 6h · met 4 of 5 days". Footer: goal met · short · total hours for the range. No trend line.
    - [x] **Castle builder** card (`CastleCard.jsx`, logic in `lib/castles.js`, built 2026-11-18; replaced a first "brick per hour this week" wall the same day), full width under the Focus timer. **One brick for every day the goal is met** (all time, each day against its own goal; today counts as soon as it's met, a running timer included). Each castle starts as a faint outline of empty brick slots; bricks fill it from the bottom row up, left to right, laid in a **running bond** (every other row shifted half a brick, half-bricks at the ends and beside openings; the top row is never shifted so battlements stay whole), in varied greens with a bevel and a drop-in animation; the next slot pulses with a dashed outline and today's brick glows. Designs are drawn as `#`/`.` rows, one character per brick width, each needing clearly more bricks: The Watchtower (30) → The Gatehouse (50) → The Keep (71) → The Castle (115) → The Citadel (159), then they repeat as "The Watchtower II" etc. **Mini castles in the top-left corner are tabs**: every finished castle (with a pennant) plus the one under construction at the end (filled in as far as it's built); click one to show it in the big view: finished ones appear complete with their flag, "Finished Jul 14, 2026" and "Built Mar 24 – Jul 14, 2026", and their bricks still show the day each was laid. The minis keep the simple grid look (not staggered). **Locked castles** (the rest of the current round of designs, at least the next one; `locked` from `getCastleProgress`) follow as grey silhouettes in dashed tabs with a padlock badge. They can't be opened (locked 2026-11-24, `PREVIEW_LOCKED = false` in `CastleCard.jsx`); set it back to true to preview a locked design fully built ("Locked · preview" pill, "Not started", "Locked · unlocks when The Castle is finished"). On the day a castle is completed it stays up with a flag and "Castle complete!"; the next one starts with the next day on goal. Hover a laid brick for the day it was laid. Header "13 / 58 bricks · 1 brick for every day on goal"; footer says whether today's brick is laid or how long until it is.
    - [-] **Dropped (2026-11-24).** **Personal records**: mostly covered now (longest day up top with a New record badge; longest block and streaks in More stats). Still open: best week total, and a "New record!" moment for the longest block too.
    - [x] **This week's timeline** (`WeekTimelineCard.jsx`, data from `getWeekTimeline`, built 2026-11-23), full width at the very bottom of the Work tab: one row per day Mon–Sun with each work session as a block at its time of day on a shared axis (6 AM – 10 PM by default, widening to whole hours to fit earlier/later sessions; a session after midnight that still belongs to the day runs past 24:00), hour labels every 2h and faint gridlines. Today's row is highlighted, its running block glows and grows live, and a line marks the time now. Blocks are **shaded by length** (`blockLevel`: under 30m / 30m–1h / 1–2h / 2h+, light → dark, with a "Block length" legend), slide in from their start; hover for "9:05 AM – 10:50 AM · 1h 45m". **‹ › arrows** page back to earlier weeks (as far as the week of the first session) and forward to this week; off this week the label reads "Weekly timeline" and a "This week" link jumps back. The card holds its own week (`WeekTimelineCard` gets `state`, `today`, `now`). The arrow button is shared with the calendar (`ui/NavButton.jsx`).
      - [x] **Editing a week** (2026-11-23), video-editor style, in a **wide popup** (`WeekEditDialog.jsx`, like Morning's day editor): opened from the pencil next to the timeline's dates (opens that week, today highlighted on this week) or by **clicking a Work calendar day** (opens that day's week with the day's row highlighted). Drag a block's edges to resize, drag its body to move it to another time or another day's row, drag across empty space to draw a new block (a plain click adds 30 min), select a block and press Delete/Backspace or the trash button to remove it; Esc deselects. The selected block shows its times and grip marks. Arrows change weeks (locked with "Save or cancel to change weeks" while there are unsaved changes); Save is disabled until something changes. Rules: snaps to 5 min, at least 15 min long, no overlaps (resizing stops at the neighbour; a move dropped on another block goes back), stays inside its day (from the day start), nothing in the future (today stops at now), a running timer's block is read-only. Edits stay in a draft (`weekBlocks` → blocks → `applyWeekBlocks` on Save). The read-only card and the popup share `charts/timeline.jsx` (grid, editable block, legend) and `lib/timeline.js` (labels). Pointer events, so touch should work too (untested on a phone). This also covers the old "day popup to fix sessions" item.
      - [x] **Week goal in the edit popup** (2026-11-23): a "Goal 8h a day" chip next to the week's dates (shows a range like "6h–7h a day" if the goal changed partway through) opens an inline editor: daily goal in hours (0.25 steps, 15 min – 16 h) and **Apply to: This week only / From this week on**, with a plain-English hint. "This week only" sets the goal from that Monday and puts back the goal that was in effect the next Monday; "From this week on" lasts until the next later change. Changes that started inside the week are folded in so all 7 days get the new goal, and back-to-back equal entries are merged (`setWeekGoal`). Checks and totals update live (a "total / goal" on each row was tried and removed). The goal change is part of the draft: saved with Save (together with block edits), dropped by Cancel. Past weeks are re-graded (calendar dots, streaks, records, castle bricks).
  - **Day dialogs:** Work is done (a calendar day opens the week edit popup). Still to do: the Workout calendar-day popup (list that day's workouts; editing comes in Stage 6).
  - [x] **Settings per tab** (2026-11-24, pulled forward from Stage 5): the header gear opens the current tab's settings. **Morning** (and All) keep the existing popup (name, target, grace, day start, weekends, Backup). **Workout** (`WorkoutSettingsDialog.jsx`): workout days per week (1–7, re-grades past weeks) plus the weight unit and goal weight. **Work** (`WorkSettingsDialog.jsx`): daily goal in hours with the same rules as "Change goal" (the "Starts: Next Monday / Today" choice only appears once the goal is changed; goal history below) plus Track weekends. Both say the name, day start and backups live in Morning's settings. The goal fields are shared with the existing popups: `useWeightGoal` + `WeightGoalFields`, `useWorkGoal` + `WorkGoalFields` (hooks in `src/hooks/`). The "Set goal" (weight chart) and "Change goal" (Today bar) shortcuts still work.
  - [x] **Greeting by time of day** (2026-11-24, `greeting` in `lib/stats.js`, tested): Morning (and All) say "Good Morning" from the day start (4 AM) until noon, "Good Afternoon" until 5 PM, then "Good Evening" through the night until the next day start, plus the name if set. `useNow` now also ticks once a minute when the timer isn't running so the greeting keeps up.
  - **Per-tracker celebrations:** blue/green versions of the sun flare for a workout-goal hit and a work-goal hit. (The time-of-day greeting is done, see below.)
  - Done when: Zach is happy with how all four tabs look on desktop using `/?demo`. Phone layout is fixed in Stage 6.

- [ ] **Stage 3 — Work timer (green, still localStorage).**
  - [x] **Focus timer card** (`WorkTimerCard.jsx`, logic in `lib/timer.js`), full width under the Work stat cards (2026-11-16):
    - Stopwatch or Timer mode (segmented toggle). Timer presets 15m / 25m / 30m / 45m / 1h (25m selected by default) plus a custom minutes field (1–720).
    - Big ring with the clock: counts up (ring loops each hour) or down (ring fills as time passes). Pulsing dot while running. Heading changes: "Start a work session" / "On the clock" / "50m block" / "Taking a break" / "Nice work".
    - Start → Pause / Stop & save → Resume. A finished countdown saves itself, plays a soft two-note chime and shows "Time's up" with Done. The running clock also shows in the browser tab title.
    - "Today 1h 35m of 6h" bar with a notch per hour; plain green under the goal, the chevron energy fill once reached. Counts the running stretch live.
    - Storage: the running timer lives in `state.timer` (mode, duration, startedAt, elapsedBefore, done), saved with the rest of `rise:data`, so it survives reloads and closing the tab. Each finished stretch (pause, stop, or countdown end) is saved as a normal `workSessions` span, rounded to whole minutes (under 30 s is dropped). So saved sessions are always complete and stats/backups never see a half-finished one. Backups leave `timer` out. (Stage 4 can still store a running session as a `work_sessions` row with `ended_at = null` for cross-device.)
    - A countdown that ran out while the tab was closed is saved up to its exact end on the next load (`settleTimer`).
    - [x] Guard rails: a stretch that crosses the day start (4 AM) is split across the two days; a note appears after 12h running.
    - Unit tests in `lib/timer.test.js`.
  - Click a calendar day → dialog listing that day's sessions; add/edit/delete manually (start/end times, optional note).
  - Stats per the table above, using the existing `workGoalMinutes` (default 6h) and `workWeekends` values. Their settings controls come in Stage 5.
  - Unit tests for editing sessions.
  - Done when: a day of real timing shows correctly on the green dashboard and survives a reload.

- [ ] **Stage 4 — Backend + login + migration (all trackers).**
  - Create Supabase project; SQL migration file in repo (`supabase/migrations/`) with the schema (`profiles`, `wake_logs`, `workouts`, `work_sessions`, `api_tokens`) + RLS policies (`user_id = auth.uid()` on every table).
  - `src/lib/api.js` data layer replacing `storage.js` (load profile + all three trackers, upsert, delete). Keep the pure functions (`logins.js`, `stats.js`, `workouts.js`, `work.js`, `spans.js`) unchanged; only the persistence moves.
  - Login screen with magic link and Google; sign-out in settings. Open sign-ups; new accounts start with default settings (the first-run setup comes in Stage 5).
  - Auth setup: Supabase redirect URLs for localhost, Vercel previews and the production domain. Google OAuth client and consent screen in Google Cloud. Env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in Vercel (production and preview).
  - Morning recording: same `recordLoginIfNeeded` logic on load/visibility, written to `wake_logs`. If offline or the write fails, queue it in localStorage and retry so a morning is never lost. Timer start/stop gets the same queue.
  - Work timer: a running session is a `work_sessions` row with `ended_at = null`, so it shows and can be stopped from any device.
  - One-time migration: on first login, if `rise:data` exists in localStorage, offer "Upload your existing data" (morning logs, workouts, work sessions, settings). The JSON backup import also writes to the backend. Export keeps working and includes all trackers.
  - Demo mode stays fully local (no backend).
  - Note: Supabase's free tier pauses a project after about a week with no activity. Daily use keeps it awake, but if it pauses, restore it from the dashboard.
  - Done when: the production URL records the morning log-on into Supabase, existing history is migrated, the timer works across two browsers, and a second browser shows the same data after login.

- [ ] **Stage 5 — Customisation + settings.**
  - [x] ~~Reorganise the settings popup by tracker~~: done in Stage 2 as one popup per tab (2026-11-24). Still to add: Account (sign out, delete) and maybe a General section if more global settings appear.
  - Toggle which trackers are enabled. Disabled ones disappear from the tabs, the All view and the "perfect days" streak.
  - First-run setup for new accounts (and an empty first visit): name, morning target, which trackers to enable, weekly/daily goals, plus a "Restore from backup" shortcut.
  - Account: sign out and **delete account** (removes all rows; needed for open sign-ups).
  - Any other customisation Zach wants (e.g. colours, celebrations on/off).
  - Done when: a brand-new account can set itself up end to end, and every v2 setting can be changed in the UI.

- [ ] **Stage 6 — Strong workouts end to end (blue) + wrap-up.**
  - `/api/ingest/workout` (Vercel function): verify bearer token (hashed in `api_tokens`, update `last_used_at`) → upsert workouts (dedupe on `source + external_id`, falling back to start time). Accepts a batch. Keep the payload generic so Health Auto Export could post to it later.
  - Shortcut design (send each workout once): automation "Strong → Is Closed → Run Immediately", "Notify When Run" off, plus an optional nightly backup automation. The Shortcut keeps a `rise-last-sent.txt` (end date of the last workout sent) in Shortcuts' iCloud folder; it runs Find Workout, keeps only workouts that ended after that date, and **stops without any network call if there are none**. Otherwise it POSTs them, and on success saves the newest end date. Closing Strong mid-workout sends nothing (unfinished workouts aren't in Health). Server still dedupes as a safety net.
  - Settings: "Connect iPhone" section — generate/revoke API token (shown once), show the endpoint URL, and step-by-step Shortcut instructions (including installing the Actions app) or a shared iCloud Shortcut link.
  - Past workouts: Strong CSV import (`/api/ingest/strong-csv` or in-browser parsing) that fills `details` with exercises/sets. Needs Zach's sample CSV (Strong → Settings → Export Strong Data).
  - Workout day dialog: show exercises when CSV detail exists; manual add/delete for missed syncs.
  - Test on Zach's phone: finish a workout → it appears in Rise; reopen Strong with nothing new → no request sent; re-sent workouts don't duplicate.
  - **Phone layout pass** (all phone visual fixes are saved for here, decided 2026-11-16). Known so far:
    - The settings gear in the header is partly cut off at the right edge.
    - Headings wrap awkwardly next to the big header icon (e.g. "Goal Crushed 💪" puts 💪 on its own line); shrink the icon and heading on small screens.
    - Check every tab and popup at phone width.
  - Wrap-up: update README (features, Supabase setup, Shortcut guide) and this plan, then merge to `main`. Sweep the open items and anything left over from earlier stages.
  - **Weight from the smart scale:** smart scale app → Apple Health (Body Mass) → iOS Shortcut → `/api/ingest/weight` (same API token as workouts). Unlike workouts, Apple's built-in **Find Health Samples** action can read Body Mass, so the Actions app may not be needed. Trigger: a Personal Automation when the scale's app closes, or a daily time automation; same send-once idea (only samples newer than the last sent). Server dedupes. To check first: which scale/app Zach has and that it writes to Health. A one-time history import of past Health weights.
  - Done when: finishing a workout in Strong shows up in Rise without touching the computer, and a weigh-in on the scale shows on the weight chart.

## Open items
- Merge `v2-stage-1` into `main` when Zach is happy with it, or keep stacking stages on the branch. Until Stage 4, merging only changes the UI, since data stays in localStorage on the same domain.
- Dev moved from the Codespace to Zach's laptop (`Desktop › Everything › Projects › Rise`, branch `v2-stage-1`) on 2026-11-16.

## Decisions (2026-11-15)
- Workout: weekly-goal streak, keep heatmap + calendar, add a per-week bar chart.
- Work: daily hour goal, input via start/stop timer, weekend toggle.
- Morning: gets the same weekend toggle.
- Login: magic link and Google.
- Multi-user: open sign-ups.
- Weight chart on the Workout tab, fed by the smart scale through Apple Health + Shortcut (2026-11-16).
- Workouts come in via Strong → Health → Shortcut with the free Actions app's Find Workout (2026-11-16).
- Look: tabs are icons; each tracker has its own colour (gold / blue / green / red for All); the sun is Morning-only (2026-11-16).
- Phone visual fixes are collected and done last, in Stage 6 (2026-11-16).
- Stage order (2026-11-16): UI design pass → work timer → backend → customisation/settings → Strong end to end.

## Ideas for later (not planned)
- **Streak badges:** gold medallions for 5 / 10 / 20 / 50 days in a row and a 100% hit-rate month, in a row under the stat cards; unearned ones as faint tan outlines.
- **"Edited" marker** on hand-edited days (entries already store `edited: true`).

## Dev notes
- `npm run dev`, then open `/?demo` to preview with ~8 months of fake data for all three trackers (dev only, never saved).
- `/?demo&week=2` sets how many days this week have a workout (previews the progress card under/on/over goal). It fills the first N days of the Mon–Sun week, using days still to come if needed, so it works on any day.
- `/?demo&work=7` sets how many hours of work are logged today (decimals work, e.g. `5.5`), to preview the Today bar under/over the goal.
- `/?demo&celebrate` (or `/?celebrate` on real data) replays the hit celebration and new-best moment on every load (dev only).
- `npm run test` (Vitest), `npm run lint`, `npm run build`.
- Data lives in `localStorage` under `rise:data`. Settings saved there override the defaults in `logins.js`; change them from the gear in the header.

## Deployment
- GitHub repo `zpoettker/Rise` (formerly `login-tracker`); Vercel auto-deploys every push to `main`, and builds a preview for other branches.
- Use the Vercel project's **production domain** (Vercel → Domains) as the Chrome startup page, not a per-deployment URL like `login-tracker-<hash>-zpoettkers-projects.vercel.app`, which is frozen to one build.
- `login-tracker.vercel.app` belongs to someone else.
- Production domain: https://login-tracker-olive.vercel.app/ (use this as the Chrome startup page)
- `localStorage` is per domain: log-ons recorded on an old per-deployment URL don't carry over to the production domain. Re-enter them via the calendar (Zach doesn't need the old URL's data).
