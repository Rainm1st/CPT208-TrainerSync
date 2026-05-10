import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Log partial URL for debugging deployment issues
if (supabaseUrl && supabaseUrl.length > 20) {
  console.log('[supabase] connecting to:', supabaseUrl.slice(0, 20) + '...' + supabaseUrl.slice(-8))
} else {
  console.warn('[supabase] Fill in VITE_SUPABASE_URL in .env.local or GitHub Secrets')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
