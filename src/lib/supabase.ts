import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim()

// Log partial URL for debugging deployment issues
if (supabaseUrl && supabaseUrl.length > 20) {
  console.log('[supabase] connecting to:', supabaseUrl.slice(0, 20) + '...' + supabaseUrl.slice(-8))
} else {
  console.warn('[supabase] Fill in VITE_SUPABASE_URL in .env.local or GitHub Secrets')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')

// Validate connectivity: lightweight HEAD request to the REST API
if (supabaseUrl) {
  fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'HEAD',
    headers: { apikey: supabaseAnonKey },
  })
    .then((res) => console.log(`[supabase] connection check: ${res.status} ${res.statusText}`))
    .catch((err) => console.error('[supabase] connection failed:', err.message))
}
