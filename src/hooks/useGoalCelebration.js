import { useEffect, useState } from 'react'
import { loadCelebrations, saveCelebration } from '../lib/storage'

// Dev only: ?celebrate replays every celebration on load
const PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('celebrate')

// The header icon's goal celebration for the tab that's showing (`tab`).
// `metById` says which goals are met today ({ morning, workout, work, custom,
// all }). A goal's celebration plays the first time its tab is shown after
// the goal is met: right away if you complete it on that tab, or when you
// next open the tab. If the goal stops being met (a check-off undone, a
// workout deleted), it's forgotten, so completing it again plays again.
// `replay()` plays it on a click while the goal is met. `playKey` changes on
// every play so the animated element restarts; `reset()` is for tab switches.
export function useGoalCelebration(tab, metById, todayKey) {
  // the day each goal last celebrated: { work: '2026-11-24', … }
  const [played, setPlayed] = useState(loadCelebrations)
  // the play that's showing now: { id, n }
  const [active, setActive] = useState({ id: null, n: 0 })
  const met = Boolean(metById[tab])
  const due = met && (PREVIEW || played[tab] !== todayKey)
  // which goals are met, as a string, so the effect below runs on changes only
  const metSignature = `,${Object.keys(metById)
    .map((id) => `${id}:${metById[id] ? 1 : 0}`)
    .join(',')},`

  // play it, and remember it's been played today
  useEffect(() => {
    if (!due) return
    const timer = setTimeout(() => {
      if (!PREVIEW) saveCelebration(tab, todayKey)
      setPlayed((p) => ({ ...p, [tab]: todayKey }))
      // same n, so the animation that started on the first render carries on
      setActive((a) => ({ id: tab, n: a.n }))
    }, 0)
    return () => clearTimeout(timer)
  }, [due, tab, todayKey])

  // forget goals that are no longer met (or were celebrated on another day)
  useEffect(() => {
    const stale = Object.keys(played).filter(
      (id) => played[id] && (played[id] !== todayKey || !metSignature.includes(`,${id}:1,`)),
    )
    if (!stale.length) return
    const timer = setTimeout(() => {
      for (const id of stale) saveCelebration(id, null)
      setPlayed((p) => ({ ...p, ...Object.fromEntries(stale.map((id) => [id, null])) }))
    }, 0)
    return () => clearTimeout(timer)
  }, [played, metSignature, todayKey])

  return {
    // playing from the very first render it's due (so the finished state never
    // flashes first), and only while the goal is met (undoing it doesn't replay)
    playing: met && (due || active.id === tab),
    playKey: `${tab}-${active.n}`,
    replay: () => met && setActive((a) => ({ id: tab, n: a.n + 1 })),
    reset: () => setActive((a) => ({ id: null, n: a.n })),
  }
}
