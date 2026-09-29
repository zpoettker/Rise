# Login Tracker — Plan

Personal morning log-on tracker. Chrome opens the Vercel site on startup; the first visit each weekday is recorded in `localStorage`.

## Rules
- **Hit:** logged on at or before the target time + 15 min grace.
- **Tracked days:** weekdays only. Weekends are ignored entirely (not shown as missed, don't break streaks).
- **Target:** one target time for every day, default 8:30 (configurable in settings).
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
- [ ] **4. Dashboard:** today hero, stat cards w/ range toggle, custom SVG heatmap
  - [x] Stat cards with 7d/30d/90d/All range toggle
  - [x] Year heatmap (`YearHeatmap.jsx`) with hover tooltips
  - [x] Month calendar (`MonthCalendar.jsx`) with month navigation
  - [ ] Replace the temporary style-guide card at the bottom of `App.jsx` with the final dashboard layout
- [ ] **5. Editing & settings:** edit/add/delete past logins, settings panel, JSON export/import
  - [x] Click a calendar day → popup to set/add its login time (`EditLoginDialog.jsx`, `setLoginTime`)
  - [ ] Settings panel (target time, grace minutes)
  - [ ] JSON export/import backup
  - [ ] (Optional) delete a login, "edited" marker
- [ ] **6. Gamification & polish:** hit celebration, high-score moment, streak badges, animations, first-run setup

## Dev notes
- `npm run dev`, then open `/?demo` to preview with ~8 months of fake data (dev only, never saved).
- `npm run test` (Vitest), `npm run lint`, `npm run build`.
- Data lives in `localStorage` under `rise:data`. Settings saved there override the defaults in `logins.js`. Until the settings panel exists, delete that key to pick up new defaults.

## Deployment
- GitHub repo `zpoettker/login-tracker`; Vercel auto-deploys every push to `main`.
- Use the Vercel project's **production domain** (Vercel → Domains) as the Chrome startup page, not a per-deployment URL like `login-tracker-<hash>-zpoettkers-projects.vercel.app`, which is frozen to one build.
- `login-tracker.vercel.app` belongs to someone else.
- Production domain: _TBD, fill in once confirmed_
