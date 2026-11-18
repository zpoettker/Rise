import { useEffect, useState } from 'react'

// The current time in ms, updated every second while `active`. It's only
// meant to be read while active, so it's fine for it to be stale otherwise.
export function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [active])
  return now
}
