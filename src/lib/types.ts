export interface Session {
  id: string
  trainee_id: string
  exercise_name: string
  exercise_id: string | null
  started_at: string
  ended_at: string | null
  duration_s: number | null
  avg_hr: number | null
  max_hr: number | null
  sets_done: number | null
}

export interface HrSample {
  id: number
  session_id: string
  bpm: number
  sampled_at: string
}

export interface SessionDetail extends Session {
  hr_samples: HrSample[]
}

export interface SessionPresence {
  trainee_id: string
  session_id: string | null
  exercise_name: string | null
  current_set: number
  current_hr: number
  updated_at: string
  gym_x: number | null
  gym_y: number | null
  heading: number | null
  raw_lat: number | null
  raw_lng: number | null
  profiles?: { username: string; avatar_url: string | null }
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface FriendProfile {
  friendship_id: string
  id: string
  username: string
  avatar_url: string | null
}

export interface FriendRequest {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  requester: { id: string; username: string; avatar_url: string | null }
}

export interface Interaction {
  id: string
  sender_id: string
  receiver_id: string
  type: 'cheer' | 'emoji'
  payload: string
  sent_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  body: string
  sent_at: string
  read_at: string | null
}

export interface ConversationSummary {
  partner_id: string
  partner_username: string
  last_message: string
  last_sent_at: string
}
