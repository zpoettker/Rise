import { supabase } from './supabase'

// Sends a magic link to `email`. Logging in only works for an existing
// account (`create` false); signing up creates one and keeps your name on it.
// The link brings you back to this page (it has to be allowed in Supabase →
// Authentication → URL Configuration).
export async function sendMagicLink(email, { create = false, name = '' } = {}) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: create,
      emailRedirectTo: window.location.origin + window.location.pathname,
      ...(create && name ? { data: { name } } : {}),
    },
  })
  if (error) throw new Error(friendlyError(error, create))
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Supabase's messages, in plain words
function friendlyError(error, create) {
  const message = error.message ?? ''
  if (!create && /signups? not allowed|user not found/i.test(message)) {
    return "There's no account with that email yet. Sign up instead?"
  }
  if (error.status === 429 || /rate limit|security purposes/i.test(message)) {
    return 'Too many emails for now. Wait a minute and try again.'
  }
  return message || 'Something went wrong. Try again in a minute.'
}
