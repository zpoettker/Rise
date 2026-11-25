import { useEffect, useState } from 'react'

// The current time in ms, updated every second while `active` and every
// minute otherwise (enough for things like the greeting).
export function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, active ? 1000 : 60 * 1000)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [active])
  return now
}
