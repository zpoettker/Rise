import { useEffect, useState } from 'react'
import { createDemoState } from '../lib/demo'
import { recordLoginIfNeeded } from '../lib/logins'
import { loadState, saveState } from '../lib/storage'

const params = new URLSearchParams(window.location.search)
const DEMO = import.meta.env.DEV && params.has('demo')
const CELEBRATE = params.has('celebrate')

// Loads saved data and records today's login on mount and whenever the tab
// becomes visible again (covers Chrome being left open overnight).
export function useLoginData() {
  const [state, setState] = useState(() =>
    DEMO ? createDemoState(new Date(), { hitToday: CELEBRATE }) : recordLoginIfNeeded(loadState()),
  )

  useEffect(() => {
    if (!DEMO) saveState(state)
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
