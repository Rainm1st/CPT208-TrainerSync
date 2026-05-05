import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { FriendProfile, FriendRequest, Interaction } from '../lib/types'

interface SocialState {
  friends: FriendProfile[]
  requests: FriendRequest[]

  fetchFriends(userId: string): Promise<void>
  fetchRequests(userId: string): Promise<void>
  sendRequest(requesterId: string, addresseeId: string): Promise<void>
  acceptRequest(friendshipId: string): Promise<void>
  declineRequest(friendshipId: string): Promise<void>
  sendInteraction(senderId: string, receiverId: string, type: 'cheer' | 'emoji', payload: string): Promise<void>
  subscribeInteractions(receiverId: string, cb: (i: Interaction) => void): () => void
}

export const useSocialStore = create<SocialState>((set) => ({
  friends: [],
  requests: [],

  fetchFriends: async (userId) => {
    const { data } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        requester:profiles!friendships_requester_id_fkey(id, username, avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(id, username, avatar_url)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')

    const friends: FriendProfile[] = (data ?? []).map((f: any) => {
      const other = f.requester_id === userId ? f.addressee : f.requester
      return { friendship_id: f.id, ...other }
    })
    set({ friends })
  },

  fetchRequests: async (userId) => {
    const { data } = await supabase
      .from('friendships')
      .select('*, requester:profiles!friendships_requester_id_fkey(id, username, avatar_url)')
      .eq('addressee_id', userId)
      .eq('status', 'pending')
    set({ requests: (data as FriendRequest[]) ?? [] })
  },

  sendRequest: async (requesterId, addresseeId) => {
    await supabase.from('friendships').insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
  },

  acceptRequest: async (friendshipId) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    set(s => ({ requests: s.requests.filter(r => r.id !== friendshipId) }))
  },

  declineRequest: async (friendshipId) => {
    await supabase.from('friendships').update({ status: 'declined' }).eq('id', friendshipId)
    set(s => ({ requests: s.requests.filter(r => r.id !== friendshipId) }))
  },

  sendInteraction: async (senderId, receiverId, type, payload) => {
    await supabase.from('interactions').insert({ sender_id: senderId, receiver_id: receiverId, type, payload })
  },

  subscribeInteractions: (receiverId, cb) => {
    const channel = supabase
      .channel(`interactions-${receiverId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions', filter: `receiver_id=eq.${receiverId}` },
        (payload) => cb(payload.new as Interaction)
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  },
}))
