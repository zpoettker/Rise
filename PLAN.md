# Login Tracker — Plan

Personal morning log-on tracker. Chrome opens the Vercel site on startup; the first visit each weekday is recorded in `localStorage`.

## Rules
- **Hit:** logged on at or before the target time + 5 min grace.
- **Tracked days:** weekdays only. Weekends are ignored entirely (not shown as missed, don't break streaks).
- **Target:** one target time for every day (configurable in settings).
- **Login:** first time the page is seen on a given day (on load or when the tab becomes visible). Refreshes don't re-record.

## Phases
- [x] **0. Scaffold & deploy:** Vite + React, Tailwind, date-fns, Vitest; GitHub → Vercel auto-deploy; Chrome startup page
- [x] **1. Data layer:** entry/settings shape, versioned `localStorage` module, `recordLoginIfNeeded()`
- [ ] **2. Stats engine:** `classifyDay`, current/best streak, average time, hit rate (pure functions, unit tested)
- [ ] **3. Design system:** sunrise palette tokens, typography, card styles
- [ ] **4. Dashboard:** today hero, stat cards w/ range toggle, custom SVG heatmap
- [ ] **5. Editing & settings:** edit/add/delete past logins, settings panel, JSON export/import
- [ ] **6. Gamification & polish:** hit celebration, high-score moment, streak badges, animations, first-run setup
