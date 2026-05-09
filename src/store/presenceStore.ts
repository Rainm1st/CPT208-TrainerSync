import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { SessionPresence } from '../lib/types'

interface PresenceUpsert {
  session_id?: string | null
  exercise_name?: string | null
  current_set?: number
  current_hr?: number
  gym_x?: number | null
  gym_y?: number | null
  heading?: number | null
  raw_lat?: number | null
  raw_lng?: number | null
}

interface PresenceState {
  presences: SessionPresence[]

  fetchAll(): Promise<void>
  upsert(traineeId: string, data: PresenceUpsert): Promise<void>
  clear(traineeId: string): Promise<void>
  subscribe(): () => void
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presences: [],

  fetchAll: async () => {
    const { data } = await supabase
      .from('session_presence')
      .select('*, profiles(username, avatar_url)')
      .order('updated_at', { ascending: false })
    set({ presences: (data as SessionPresence[]) ?? [] })
  },

  upsert: async (traineeId, data) => {
    await supabase
      .from('session_presence')
      .upsert({ trainee_id: traineeId, ...data, updated_at: new Date().toISOString() },
               { onConflict: 'trainee_id' })
  },

  clear: async (traineeId) => {
    await supabase.from('session_presence').delete().eq('trainee_id', traineeId)
    set(s => ({ presences: s.presences.filter(p => p.trainee_id !== traineeId) }))
  },

  subscribe: () => {
    const channel = supabase
      .channel('presence-changes')

      // New user joined → full fetch to get profile join
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'session_presence' },
        () => get().fetchAll()
      )

      // Position/HR update → patch in place, no re-fetch needed
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_presence' },
        (payload) => {
          const updated = payload.new as SessionPresence
          set(s => ({
            presences: s.presences.map(p =>
              p.trainee_id === updated.trainee_id
                ? { ...p, ...updated }   // keep cached profiles join, patch updated fields
                : p
            ),
          }))
        }
      )

      // User left → remove from list
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'session_presence' },
        (payload) => {
          const gone = (payload.old as { trainee_id: string }).trainee_id
          set(s => ({ presences: s.presences.filter(p => p.trainee_id !== gone) }))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },
}))
