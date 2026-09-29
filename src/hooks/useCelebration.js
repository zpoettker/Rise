import { useEffect, useState } from 'react'
import { loadCelebratedDay, saveCelebratedDay } from '../lib/storage'

// Dev only: open with ?celebrate to replay the celebrations any time.
const PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('celebrate')

// True when the hit celebration should play: today is a hit and it hasn't
// played yet today. Once it starts it stays true for this page load (the CSS
// animations run once), and it won't play again until tomorrow.
export function useCelebration(todayKey, isHitToday) {
  const [lastCelebrated] = useState(loadCelebratedDay)
  const celebrate = PREVIEW || (isHitToday && lastCelebrated !== todayKey)

  useEffect(() => {
    if (celebrate && !PREVIEW) saveCelebratedDay(todayKey)
  }, [celebrate, todayKey])

  return { celebrate, preview: PREVIEW }
}
