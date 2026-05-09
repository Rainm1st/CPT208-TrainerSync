import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useSocialStore } from '../../store/socialStore'
import { BottomNav } from '../../components/BottomNav'

const QUICK_PHRASES = ['Go! 💪','Good form! ✅','Watch breath']
const QUICK_EMOJIS  = ['💪','🔥','👍','⚡','🎉']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function CoachChatPage() {
  const { id = '' }  = useParams()
  const navigate     = useNavigate()
  const { profile }  = useAuthStore()
  const { messages, fetchMessages, sendMessage, subscribeMessages } = useChatStore()
  const { sendInteraction } = useSocialStore()

  const [input, setInput] = useState('')
  const [toast, setToast] = useState<string|null>(null)
  const [burst, setBurst] = useState<string|null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isUUID    = UUID_RE.test(id)
  const threadMsgs = isUUID ? (messages[id] ?? []) : []

  // Derive display name
  const partnerName = isUUID ? id.slice(0, 8) : `Xiao ${id}`

  useEffect(() => {
    if (!profile || !isUUID) return
    fetchMessages(profile.id, id)
    const unsub = subscribeMessages(profile.id, (m) => {
      if (m.sender_id === id) {
        // chatStore handles the state update via the cb — refetch to get full list
        fetchMessages(profile.id, id)
      }
    })
    return unsub
  }, [profile, id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [threadMsgs])

  function showToast(t: string) { setToast(t); setTimeout(() => setToast(null), 2000) }

  async function send(text?: string) {
    const t = text ?? input.trim()
    if (!t || !profile) return
    setInput('')
    if (isUUID) {
      await sendMessage(profile.id, id, t)
    }
    showToast('Message sent!')
  }

  function sendEmoji(e: string) {
    setBurst(e)
    showToast('Emoji sent!')
    setTimeout(() => setBurst(null), 900)
    if (profile && isUUID) sendInteraction(profile.id, id, 'emoji', e)
  }

  // Static fallback messages for demo (non-UUID route)
  const staticMsgs = [
    { side:'right', text:"Coach, how's my form looking?", time:'14:20 · Trainee' },
    { side:'coach', text:'Looking solid — keep elbows at 45°.', time:'14:25 · You' },
    { side:'right', text:'I feel great today!', time:'14:32 · Trainee' },
  ]

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      {burst && (
        <div style={{ position:'fixed',inset:0,zIndex:999,pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ fontSize:80, animation:'emojiBurst 0.9s ease-out forwards' }}>{burst}</span>
        </div>
      )}
      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>

      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate('/coach/messages')}>← Back</button>
          <span className="hbar-ttl">{partnerName}</span>
          <span />
        </div>

        <div className="content no-pad-bot" style={{ justifyContent:'space-between', gap:0 }}>
          {/* Messages */}
          <div className="chat-stack" style={{ flex:1, paddingBottom:10 }}>
            {isUUID ? threadMsgs.map((m) => {
              const isMine = m.sender_id === profile?.id
              return (
                <div key={m.id} style={ isMine ? { alignSelf:'flex-end' } : {} }>
                  {isMine
                    ? <div className="bubble-right">{m.body}</div>
                    : <div className="bubble-coach">{m.body}</div>
                  }
                  <div className="bubble-time" style={ isMine ? { textAlign:'right' } : {} }>
                    {new Date(m.sent_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })}
                  </div>
                </div>
              )
            }) : staticMsgs.map((m, i) => (
              <div key={i} style={ m.side === 'right' ? { alignSelf:'flex-end' } : {} }>
                {m.side === 'right'
                  ? <div className="bubble-right">{m.text}</div>
                  : <div className="bubble-coach">{m.text}</div>
                }
                <div className="bubble-time" style={ m.side === 'right' ? { textAlign:'right' } : {} }>{m.time}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ flexShrink:0, borderTop:'1px solid var(--bd)', paddingTop:10, paddingBottom:'max(10px,env(safe-area-inset-bottom))' }}>
            <div className="chat-input-row">
              <input
                placeholder="Type a message…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
              />
              <button className="chat-send-btn" onClick={() => send()}>Send</button>
            </div>
            <div className="label-sm" style={{ marginTop:9, marginBottom:5 }}>Quick phrases</div>
            <div className="chips" style={{ marginBottom:7 }}>
              {QUICK_PHRASES.map(p => (
                <button key={p} className="chip" onClick={() => send(p)}>{p}</button>
              ))}
            </div>
            <div className="label-sm" style={{ marginBottom:5 }}>Quick emoji</div>
            <div className="chips">
              {QUICK_EMOJIS.map(e => (
                <button key={e} className="chip" style={{ padding:'4px 9px' }} onClick={() => sendEmoji(e)}>{e}</button>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    </>
  )
}
