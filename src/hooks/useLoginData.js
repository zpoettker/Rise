import { useEffect, useState } from 'react'
import { recordLoginIfNeeded } from '../lib/logins'
import { loadState, saveState } from '../lib/storage'

// Loads saved data and records today's login on mount and whenever the tab
// becomes visible again (covers Chrome being left open overnight).
export function useLoginData() {
  const [state, setState] = useState(() => recordLoginIfNeeded(loadState()))

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setState((s) => recordLoginIfNeeded(s))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return [state, setState]
}
