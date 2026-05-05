import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSocialStore } from '../../store/socialStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useSessionStore } from '../../store/sessionStore'
import type { Session } from '../../lib/types'

const CHEERS = ['Go! 💪', 'Keep it up! 🔥']
const EMOJIS = ['💪','🔥','👍','⚡','🎉','🏆']

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtDuration(s: number | null) {
  return s ? `${Math.round(s / 60)} min` : '—'
}

function hrColor(bpm: number | null) {
  if (!bpm) return 'var(--mu)'
  return bpm > 150 ? 'var(--red)' : bpm > 120 ? 'var(--green)' : 'var(--z-blue)'
}

export default function BuddyProfilePage() {
  const { id = '' }     = useParams()
  const navigate        = useNavigate()
  const { profile }     = useAuthStore()
  const { sendInteraction, sendRequest, subscribeInteractions } = useSocialStore()
  const { presences, fetchAll } = usePresenceStore()
  const { fetchSessions }       = useSessionStore()

  const [burst, setBurst]           = useState<string|null>(null)
  const [toast, setToast]           = useState<string|null>(null)
  const [friendRequested, setFriendRequested] = useState(false)
  const [buddySessions, setBuddySessions]     = useState<Session[]>([])

  const isUUID = UUID_RE.test(id)

  const presence      = isUUID ? presences.find(p => p.trainee_id === id) : null
  const buddyUsername = presence?.profiles?.username ?? (isUUID ? id.slice(0, 8) : `Xiao ${id}`)
  const buddyInit     = buddyUsername.slice(0, 2).toUpperCase()
  const currentHR     = presence?.current_hr ?? 0
  const currentSet    = presence?.current_set ?? 0
  const currentEx     = presence?.exercise_name ?? null

  useEffect(() => {
    fetchAll()
    if (isUUID) {
      fetchSessions(id).then(setBuddySessions)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to incoming interactions from this buddy
  useEffect(() => {
    if (!profile) return
    const unsub = subscribeInteractions(profile.id, (i) => {
      if (i.sender_id === id) {
        setBurst(i.payload)
        showToast(`${buddyUsername} sent ${i.type === 'cheer' ? 'a cheer' : 'an emoji'}!`)
        setTimeout(() => setBurst(null), 900)
      }
    })
    return unsub
  }, [profile, id]) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(t: string) { setToast(t); setTimeout(() => setToast(null), 2400) }

  function sendEmoji(e: string) {
    setBurst(e); showToast('Emoji sent!'); setTimeout(() => setBurst(null), 900)
    if (profile && isUUID) sendInteraction(profile.id, id, 'emoji', e)
  }

  function sendCheer(text: string) {
    showToast('Cheer sent!')
    if (profile && isUUID) sendInteraction(profile.id, id, 'cheer', text)
  }

  function handleSendRequest() {
    if (profile && isUUID) { sendRequest(profile.id, id); setFriendRequested(true); showToast('Friend request sent!') }
  }

  // Compute stats from their sessions
  const totalSec = buddySessions.reduce((sum, s) => sum + (s.duration_s ?? 0), 0)
  const totalH   = totalSec > 0 ? `${(totalSec / 3600).toFixed(1)}h` : '—'
  const avgHrAll = buddySessions.length > 0
    ? Math.round(buddySessions.filter(s => s.avg_hr).reduce((sum, s) => sum + (s.avg_hr ?? 0), 0) / buddySessions.filter(s => s.avg_hr).length)
    : null

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const weekCount  = buddySessions.filter(s => s.started_at >= oneWeekAgo).length

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
          <button className="hbar-back" onClick={() => navigate(-1)}>← Back</button>
          <span className="hbar-ttl">Live View</span>
          <span />
        </div>

        <div className="content">

          {/* Profile card */}
          <div className="card" style={{ padding:'12px 14px' }}>
            <div className="row" style={{ gap:10, marginBottom:10 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div className="avatar" style={{ width:56, height:56, fontSize:22, border:'2px solid var(--z-green)', boxShadow:'0 0 0 2px rgba(34,197,94,0.2)' }}>{buddyInit}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--tx)', marginBottom:2 }}>{buddyUsername} <span style={{ fontSize:14 }}>💚</span></div>
                <div className="fs10 t-m" style={{ marginBottom:4 }}>📍 Nearby · {presence ? 'Training now' : 'Recently active'}</div>
                <button
                  className="btn-ghost fs10"
                  style={{ padding:'4px 10px', borderRadius:6, width:'auto' }}
                  onClick={handleSendRequest}
                  disabled={friendRequested}
                >
                  {friendRequested ? '✓ Requested' : '⭐ Add Friend'}
                </button>
              </div>
            </div>
            {/* Stats row — real data */}
            <div style={{ display:'flex', gap:6, padding:'8px 0', borderTop:'1px solid var(--bd)' }}>
              <div style={{ flex:1, textAlign:'center' }}>
                <div className="fs10 t-m">This Week</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:'var(--tx)' }}>{weekCount}</div>
              </div>
              <div style={{ width:1, background:'var(--bd)' }} />
              <div style={{ flex:1, textAlign:'center' }}>
                <div className="fs10 t-m">Total Time</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:'var(--tx)' }}>{totalH}</div>
              </div>
              <div style={{ width:1, background:'var(--bd)' }} />
              <div style={{ flex:1, textAlign:'center' }}>
                <div className="fs10 t-m">Avg HR</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700 }} className="t-g">
                  {avgHrAll ?? (currentHR > 0 ? currentHR : '—')}
                </div>
              </div>
            </div>
          </div>

          {/* Live Now — only if active */}
          {presence && currentEx && (
            <div className="card" style={{ padding:'10px 12px' }}>
              <div className="row-between" style={{ marginBottom:8 }}>
                <div className="fs12 fw6">🔴 Live Now</div>
                <div className="fs10 t-m">Active</div>
              </div>
              <div className="fs13 fw7" style={{ marginBottom:8 }}>{currentEx}</div>
              <div className="row" style={{ gap:8, marginBottom:8 }}>
                <div style={{ flex:1, background:'var(--s0)', border:'1px solid var(--bd)', borderRadius:8, padding:'6px 8px', textAlign:'center' }}>
                  <div className="fs9 t-m" style={{ marginBottom:2 }}>HEART RATE</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:700 }} className="t-g">{currentHR}</div>
                </div>
                <div style={{ flex:1, background:'var(--s0)', border:'1px solid var(--bd)', borderRadius:8, padding:'6px 8px', textAlign:'center' }}>
                  <div className="fs9 t-m" style={{ marginBottom:2 }}>SET</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:700, color:'var(--tx)' }}>{currentSet}/5</div>
                </div>
              </div>
              <div className="set-dots">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className={`sdot${i < currentSet - 1 ? ' done' : i === currentSet - 1 ? ' cur' : ''}`} />
                ))}
              </div>
            </div>
          )}

          {/* Send Interaction */}
          <div className="card" style={{ padding:'10px 12px' }}>
            <div className="fs11 fw6" style={{ marginBottom:6 }}>Send Interaction</div>
            <div style={{ display:'flex', gap:4, marginBottom:6 }}>
              {CHEERS.map(c => (
                <button key={c} className="cheer-btn" style={{ flex:1, padding:6, fontSize:11 }} onClick={() => sendCheer(c)}>{c}</button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:3 }}>
              {EMOJIS.map(e => (
                <div key={e} className="emoji-cell" style={{ height:32, fontSize:14 }} onClick={() => sendEmoji(e)}>{e}</div>
              ))}
            </div>
          </div>

          {/* Recent Sessions — real data */}
          {(buddySessions.length > 0 || isUUID) && (
            <div className="card" style={{ padding:'10px 12px' }}>
              <div className="fs11 fw6" style={{ marginBottom:6 }}>
                Recent Sessions {buddySessions.length > 0 && `(${buddySessions.length})`}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {buddySessions.length === 0 ? (
                  <div className="fs11 t-m" style={{ textAlign:'center' }}>No sessions yet</div>
                ) : buddySessions.slice(0, 3).map(s => (
                  <div key={s.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 7px', background:'var(--s0)', borderRadius:6, border:'1px solid var(--bd)' }}>
                    <div className="fs11">{s.exercise_name}</div>
                    <div className="fs10 t-m">
                      {fmtDate(s.started_at)} · {fmtDuration(s.duration_s)} · <span style={{ color:hrColor(s.avg_hr) }}>{s.avg_hr ?? '—'} bpm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          <div className="card" style={{ padding:'10px 12px', background:'linear-gradient(145deg,var(--s1),rgba(245,158,11,0.04))', borderColor:'rgba(245,158,11,0.22)' }}>
            <div className="fs11 fw6" style={{ marginBottom:6 }}>🏅 Achievements</div>
            <div style={{ display:'flex', gap:4 }}>
              {[['🥇','PR Bench'],['🔥','5 Day Streak'],['💯','100 Sessions']].map(([icon,label]) => (
                <div key={label} style={{ flex:1, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:6, padding:5, textAlign:'center' }}>
                  <div style={{ fontSize:18, lineHeight:1 }}>{icon}</div>
                  <div className="fs9 t-m" style={{ marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
