import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../data/accounts'
import type { Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  username: string
  role: 'trainee' | 'coach'
  avatar_url: string | null
  bio: string | null
}

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  init: () => () => void
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,

  init: () => {
    let cancelled = false

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return
        if (session) {
          // Existing session — load profile
          set({ session })
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (!cancelled) set({ profile: data as Profile | null, loading: false })
        } else {
          // No session — auto-login with demo account
          const { data, error } = await supabase.auth.signInWithPassword({
            email: DEMO_EMAIL,
            password: DEMO_PASSWORD,
          })
          if (cancelled) return
          if (error || !data.session) {
            console.warn('[auto-login] failed:', error?.message ?? 'no session')
            set({ loading: false })
            return
          }
          set({ session: data.session })
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()
          if (!cancelled) set({ profile: profileData as Profile | null, loading: false })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[auto-login] unexpected error:', err instanceof Error ? err.message : err)
          set({ loading: false })
        }
      })

    // Keep session in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (cancelled) return
        set({ session })
        if (!session) set({ profile: null, loading: false })
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  },

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    set({ profile: data as Profile | null, loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))
