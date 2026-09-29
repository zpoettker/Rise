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

## Status (2026-09-29)
**Complete.** All phases are done and Zach is happy with the app as it is. Nothing is planned; any new work should start from a request.

## Ideas for later (not planned)
- **Streak badges:** gold medallions for 5 / 10 / 20 / 50 days in a row and a 100% hit-rate month, in a row under the stat cards; unearned ones as faint tan outlines.
- **First-run setup:** welcome card when there's no data (first visit or after a cache clear) to set target, grace and day start, with a "Restore from backup" shortcut.
- **"Edited" marker** on hand-edited days (entries already store `edited: true`).

## Dev notes
- `npm run dev`, then open `/?demo` to preview with ~8 months of fake data (dev only, never saved).
- `/?demo&celebrate` (or `/?celebrate` on real data) replays the hit celebration and new-best moment on every load (dev only).
- `npm run test` (Vitest), `npm run lint`, `npm run build`.
- Data lives in `localStorage` under `rise:data`. Settings saved there override the defaults in `logins.js`; change them from the gear in the header.

## Deployment
- GitHub repo `zpoettker/login-tracker`; Vercel auto-deploys every push to `main`.
- Use the Vercel project's **production domain** (Vercel → Domains) as the Chrome startup page, not a per-deployment URL like `login-tracker-<hash>-zpoettkers-projects.vercel.app`, which is frozen to one build.
- `login-tracker.vercel.app` belongs to someone else.
- Production domain: https://login-tracker-olive.vercel.app/ (use this as the Chrome startup page)
- `localStorage` is per domain: log-ons recorded on an old per-deployment URL don't carry over to the production domain. Re-enter them via the calendar (Zach doesn't need the old URL's data).
