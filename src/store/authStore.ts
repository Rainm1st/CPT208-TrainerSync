import { create } from 'zustand'
import { supabase } from '../lib/supabase'
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
    // Load session + profile on first mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      set({ session })
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        set({ profile: data as Profile | null, loading: false })
      } else {
        set({ loading: false })
      }
    })

    // Keep session in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        set({ session })
        if (!session) set({ profile: null, loading: false })
      }
    )

    return () => subscription.unsubscribe()
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
