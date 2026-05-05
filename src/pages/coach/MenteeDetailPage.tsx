import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useSocialStore } from '../../store/socialStore'
import { useChatStore } from '../../store/chatStore'
import { useSessionStore } from '../../store/sessionStore'
import { BottomNav } from '../../components/BottomNav'
import type { Session } from '../../lib/types'

const EMOJIS = ['💪','🔥','👍','⚡','🎉','😤','🏆','💯','🚀','😎','🙌','❤️']
const CHEERS  = ['Go! 💪','You can! 🙌','One more! 🔥','Good form! ✅','Watch breath! 🌬','Keep pace! ⏱']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtDuration(s: number | null) {
  return s ? `${Math.round(s / 60)}min` : '—'
}

function hrZoneClass(hr: number) {
  if (hr > 150) return 't-r'
  if (hr > 110) return 't-g'
  return 't-b'
}

export default function MenteeDetailPage() {
  const { id = '' } = useParams()
  const navigate    = useNavigate()
  const { profile } = useAuthStore()
  const { presences, fetchAll }   = usePresenceStore()
  const { sendInteraction }       = useSocialStore()
  const { sendMessage }           = useChatStore()
  const { fetchSessions }         = useSessionStore()

  const [toast, setToast]         = useState<string|null>(null)
  const [msg, setMsg]             = useState('')
  const [burst, setBurst]         = useState<string|null>(null)
  const [menteeSessions, setMenteeSessions] = useState<Session[]>([])

  const isUUID = UUID_RE.test(id)

  useEffect(() => {
    fetchAll()
    if (isUUID) fetchSessions(id).then(setMenteeSessions)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const presence   = isUUID ? presences.find(p => p.trainee_id === id) : null
  const menteeName = presence?.profiles?.username ?? (isUUID ? id.slice(0, 8) : `Xiao ${id}`)
  const currentHR  = presence?.current_hr ?? 0
  const currentSet = presence?.current_set ?? 0
  const currentEx  = presence?.exercise_name ?? null
  const isActive   = !!presence && !!currentEx

  function showToast(t: string) { setToast(t); setTimeout(() => setToast(null), 2200) }
  function sendBurst(e: string) { setBurst(e); showToast('Emoji sent!'); setTimeout(() => setBurst(null), 900) }

  function handleSendEmoji(e: string) {
    sendBurst(e)
    if (profile && isUUID) sendInteraction(profile.id, id, 'emoji', e)
  }

  function handleSendCheer(c: string) {
    showToast('Sent!')
    if (profile && isUUID) sendInteraction(profile.id, id, 'cheer', c)
  }

  async function handleSendMessage() {
    if (!msg.trim() || !profile) return
    if (isUUID) await sendMessage(profile.id, id, msg.trim())
    showToast('Message sent!')
    setMsg('')
  }

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
          <button className="hbar-back" onClick={() => navigate('/mentees')}>← Back</button>
          <span className="hbar-ttl">{menteeName}</span>
          <span />
        </div>

        <div className="content">

          {/* Live status */}
          <div className="card">
            <div className="card-ttl">Live Status</div>
            <div className="row" style={{ gap:13, marginBottom:10 }}>
              <div className="avatar av-lg">{menteeName.slice(0,2).toUpperCase()}</div>
              <div>
                <div style={{ fontSize:15, fontWeight:700 }}>{menteeName}</div>
                <div className={`fs11 ${isActive ? hrZoneClass(currentHR) : 't-m'}`}>
                  {isActive ? `Training · ${currentEx}` : 'Offline'}
                </div>
              </div>
            </div>
            {isActive && (
              <div className="kpi-grid" style={{ marginBottom:10 }}>
                <div className="kpi-box"><div className="kpi-lbl">Exercise</div><div style={{ fontSize:12, fontWeight:700 }}>{currentEx}</div></div>
                <div className="kpi-box"><div className="kpi-lbl">Heart Rate</div><div style={{ fontSize:12, fontWeight:700 }} className={hrZoneClass(currentHR)}>{currentHR} bpm</div></div>
                <div className="kpi-box"><div className="kpi-lbl">Set</div><div style={{ fontSize:12, fontWeight:700 }}>{currentSet} / 5</div></div>
                <div className="kpi-box"><div className="kpi-lbl">Target Zone</div><div style={{ fontSize:11, fontWeight:700 }}>120 – 150 bpm</div></div>
              </div>
            )}
          </div>

          {/* Send interaction */}
          <div className="card">
            <div className="card-ttl">Send Interaction</div>
            <div style={{ border:'1px solid rgba(168,85,247,0.28)', borderRadius:10, padding:10, marginBottom:10 }}>
              <div className="label-sm" style={{ color:'var(--coach)', marginBottom:6 }}>Coach-exclusive: Direct Message</div>
              <div className="chat-input-row" style={{ marginTop:0 }}>
                <input
                  placeholder="Type a message…"
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="chat-send-btn" onClick={handleSendMessage}>Send</button>
              </div>
            </div>
            <div className="label-sm" style={{ marginBottom:6 }}>Quick Encouragement</div>
            <div className="cheer-grid" style={{ marginBottom:10 }}>
              {CHEERS.map(c => (
                <button key={c} className="cheer-btn coach-c" onClick={() => handleSendCheer(c)}>{c}</button>
              ))}
            </div>
            <div className="label-sm" style={{ marginBottom:6 }}>Send Emoji</div>
            <div className="emoji-grid-6">
              {EMOJIS.map(e => (
                <div key={e} className="emoji-cell" onClick={() => handleSendEmoji(e)}>{e}</div>
              ))}
            </div>
          </div>

          {/* Session History — real data */}
          <div className="card">
            <div className="row-between" style={{ marginBottom:8 }}>
              <div className="card-ttl" style={{ marginBottom:0 }}>
                Session History {menteeSessions.length > 0 && `(${menteeSessions.length})`}
              </div>
              <span className="t-c fs11">All →</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {menteeSessions.length === 0 ? (
                <div className="t-m fs11" style={{ textAlign:'center' }}>No sessions recorded</div>
              ) : menteeSessions.slice(0, 5).map(s => (
                <div key={s.id} className="list-item fs12" style={{ padding:'7px 9px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:600 }}>{s.exercise_name}</div>
                    <div className="fs10 t-m">{fmtDate(s.started_at)} · {fmtDuration(s.duration_s)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:13, fontWeight:700, color: s.avg_hr && s.avg_hr > 150 ? 'var(--red)' : 'var(--green)' }}>
                      {s.avg_hr ?? '—'} bpm
                    </div>
                    <div className="fs10 t-m">{s.sets_done ?? '—'} sets</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <BottomNav />
      </div>
    </>
  )
}
