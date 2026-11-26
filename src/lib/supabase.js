import { createClient } from '@supabase/supabase-js'

// The Supabase client, or null when the project isn't configured (no
// .env.local), in which case the app keeps working on localStorage only.
// The publishable key is safe in the browser: every table's row-level
// security limits each account to its own rows.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null
