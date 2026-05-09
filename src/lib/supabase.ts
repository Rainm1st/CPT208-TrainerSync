import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
  console.warn('[supabase] Fill in VITE_SUPABASE_URL in .env.local')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
