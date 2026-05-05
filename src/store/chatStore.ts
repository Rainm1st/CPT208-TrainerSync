import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Message, ConversationSummary } from '../lib/types'

interface ChatState {
  conversations: ConversationSummary[]
  messages: Record<string, Message[]>

  fetchConversations(userId: string): Promise<void>
  fetchMessages(userId: string, partnerId: string): Promise<void>
  sendMessage(senderId: string, receiverId: string, body: string): Promise<void>
  subscribeMessages(userId: string, cb: (m: Message) => void): () => void
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  messages: {},

  fetchConversations: async (userId) => {
    const { data } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, body, sent_at, profiles!messages_sender_id_fkey(username)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('sent_at', { ascending: false })

    if (!data) return

    const seen = new Map<string, ConversationSummary>()
    for (const row of data as any[]) {
      const partnerId = row.sender_id === userId ? row.receiver_id : row.sender_id
      if (!seen.has(partnerId)) {
        seen.set(partnerId, {
          partner_id: partnerId,
          partner_username: row.sender_id === userId ? '' : (row.profiles?.username ?? partnerId),
          last_message: row.body,
          last_sent_at: row.sent_at,
        })
      }
    }

    const convos = Array.from(seen.values())
    const partnerIds = convos.filter(c => !c.partner_username).map(c => c.partner_id)
    if (partnerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', partnerIds)
      if (profiles) {
        const map = Object.fromEntries((profiles as any[]).map(p => [p.id, p.username]))
        for (const c of convos) {
          if (!c.partner_username) c.partner_username = map[c.partner_id] ?? c.partner_id
        }
      }
    }

    set({ conversations: convos })
  },

  fetchMessages: async (userId, partnerId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order('sent_at', { ascending: true })
    set(s => ({ messages: { ...s.messages, [partnerId]: (data as Message[]) ?? [] } }))
  },

  sendMessage: async (senderId, receiverId, body) => {
    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: senderId, receiver_id: receiverId, body })
      .select()
      .single()
    if (data) {
      set(s => ({
        messages: {
          ...s.messages,
          [receiverId]: [...(s.messages[receiverId] ?? []), data as Message],
        },
      }))
    }
  },

  subscribeMessages: (userId, cb) => {
    const channel = supabase
      .channel(`messages-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
        (payload) => cb(payload.new as Message)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}))
