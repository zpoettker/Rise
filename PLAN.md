# Login Tracker — Plan

Personal morning log-on tracker. Chrome opens the Vercel site on startup; the first visit each weekday is recorded in `localStorage`.

## Rules
- **Hit:** logged on at or before the target time + grace. Anything after is **late**; a past weekday with no log on is **missed**.
- **Tracked days:** weekdays only. Weekends are ignored entirely (not shown as missed, don't break streaks).
- **Target:** one target time for every day, default 8:30 with 15 min grace (both configurable in settings). Changing them re-grades all past days.
- **Login:** first time the page is seen on a given day (on load or when the tab becomes visible). Refreshes don't re-record.

## Design decisions
- Keep the soft sunrise look: cream background, gold/orange `sun-*` scale, Fraunces (headings/numbers) + Nunito (body).
- Hit days are gold, shaded darker the earlier the log-on (`hitLevel`: 8:26–8:45 / 5+ / 15+ / 30+ min early). Late and missed days share one muted tan (`miss`, a deeper shade of the blank `empty` tan; the heatmap uses the slightly darker `miss-dark` since its cells are tiny). No-data days stay blank. No purple.
- Header reads "Good Morning, Zach".
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
- [ ] **5. Editing & settings:** edit/add/delete past logins, settings panel, JSON export/import
  - [x] Click a calendar day → popup to set/add its login time (`EditLoginDialog.jsx`, `setLoginTime`)
  - [x] Settings panel: gear in the header → `SettingsDialog.jsx` (target time, grace 0–60 min, reset to defaults). Saved via `updateSettings`; past days are re-graded with the new settings. Popups share `ui/Dialog.jsx`.
  - [ ] JSON export/import backup
  - [ ] (Optional) delete a login, "edited" marker
- [ ] **6. Gamification & polish:** hit celebration, high-score moment, streak badges, animations, first-run setup

## Next up
1. **JSON export/import backup.** Planned as a "Backup" section inside the settings popup: download all data as a `.json` file, and load one back (validate it, confirm before overwriting).
2. (Optional) delete a login from the day popup; show a small marker on hand-edited days (entries already store `edited: true`).
3. Then Phase 6.

## Dev notes
- `npm run dev`, then open `/?demo` to preview with ~8 months of fake data (dev only, never saved).
- `npm run test` (Vitest), `npm run lint`, `npm run build`.
- Data lives in `localStorage` under `rise:data`. Settings saved there override the defaults in `logins.js`; change them from the gear in the header.

## Deployment
- GitHub repo `zpoettker/login-tracker`; Vercel auto-deploys every push to `main`.
- Use the Vercel project's **production domain** (Vercel → Domains) as the Chrome startup page, not a per-deployment URL like `login-tracker-<hash>-zpoettkers-projects.vercel.app`, which is frozen to one build.
- `login-tracker.vercel.app` belongs to someone else.
- Production domain: https://login-tracker-olive.vercel.app/ (use this as the Chrome startup page)
- `localStorage` is per domain: log-ons recorded on an old per-deployment URL don't carry over to the production domain. Re-enter them via the calendar, or use export/import once it exists.
