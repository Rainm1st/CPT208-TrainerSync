import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Session, SessionDetail } from '../lib/types'

interface SessionStats {
  avg_hr: number
  max_hr: number
  sets_done: number
  duration_s: number
}

interface SessionState {
  activeSessionId: string | null
  recentSessions: Session[]
  currentSessionDetail: SessionDetail | null

  startSession(traineeId: string, exerciseName: string, exerciseId?: string): Promise<string | null>
  endSession(sessionId: string, stats: SessionStats): Promise<void>
  recordHR(sessionId: string, bpm: number): Promise<void>
  fetchRecent(traineeId: string): Promise<void>
  fetchSessionDetail(sessionId: string): Promise<void>
  fetchSessions(userId: string): Promise<Session[]>
  clearActive(): void
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  recentSessions: [],
  currentSessionDetail: null,

  startSession: async (traineeId, exerciseName, exerciseId) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ trainee_id: traineeId, exercise_name: exerciseName, exercise_id: exerciseId ?? null })
      .select('id')
      .single()
    if (error || !data) { console.error('startSession:', error); return null }
    set({ activeSessionId: data.id })
    return data.id
  },

  endSession: async (sessionId, { avg_hr, max_hr, sets_done, duration_s }) => {
    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString(), avg_hr, max_hr, sets_done, duration_s })
      .eq('id', sessionId)
    set({ activeSessionId: null })
  },

  recordHR: async (sessionId, bpm) => {
    await supabase.from('hr_samples').insert({ session_id: sessionId, bpm })
  },

  fetchRecent: async (traineeId) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('trainee_id', traineeId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10)
    set({ recentSessions: data ?? [] })
  },

  fetchSessionDetail: async (sessionId) => {
    const { data } = await supabase
      .from('sessions')
      .select('*, hr_samples(*)')
      .eq('id', sessionId)
      .single()
    set({ currentSessionDetail: (data as SessionDetail) ?? null })
  },

  fetchSessions: async (userId) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('trainee_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10)
    return (data as Session[]) ?? []
  },

  clearActive: () => set({ activeSessionId: null }),
}))
