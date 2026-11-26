import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// The signed-in Supabase session, or null when signed out (or when Supabase
// isn't configured). `ready` turns true once the saved session has been read,
// so the UI doesn't flash "signed out" on load. Coming back from a magic
// link, the client finishes the sign-in from the URL by itself.
export function useSession() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  return { session, ready }
}
