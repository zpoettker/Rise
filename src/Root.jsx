import App from './App'
import { AuthPage } from './components/AuthPage'
import { DEMO } from './hooks/useLoginData'
import { useSession } from './hooks/useSession'
import { supabase } from './lib/supabase'

// The way in: you need an account to use Rise. Signed out, you get the log
// in / sign up page; signed in, the app. The demo (?demo) skips the account,
// and so does a copy with no Supabase project configured (local only).
export default function Root() {
  const { session, ready } = useSession()
  if (DEMO || !supabase) return <App session={null} />
  // still reading the saved session: show nothing rather than flash the login
  if (!ready) return null
  if (!session) return <AuthPage />
  return <App key={session.user.id} session={session} />
}
