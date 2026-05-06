import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useSocialStore } from '../../store/socialStore'
import { supabase } from '../../lib/supabase'
import { BottomNav } from '../../components/BottomNav'

interface Mentee {
  id: string
  username: string
  avatar_url: string | null
}

export default function CoachPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { presences, fetchAll, subscribe } = usePresenceStore()
  const { sendInteraction } = useSocialStore()
  const [mentees, setMentees] = useState<Mentee[]>([])

  const initial = (profile?.username ?? 'C').slice(0, 1).toUpperCase()

  useEffect(() => {
    fetchAll()
    const unsub = subscribe()
    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data: rows } = await supabase
        .from('coach_trainees')
        .select('trainee_id')
        .eq('coach_id', profile.id)
      if (!rows?.length) return
      const ids = rows.map((r: any) => r.trainee_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids)
      setMentees((profiles as Mentee[]) ?? [])
    })()
  }, [profile])

  // Cross-reference mentees with presences
  const menteeIds = new Set(mentees.map(m => m.id))
  const activePresences = presences.filter(p => menteeIds.has(p.trainee_id))

  function hrZoneClass(hr: number) {
    if (hr > 150) return 't-r'
    if (hr > 110) return 't-g'
    return 't-b'
  }

  function handleSendInteraction(menteeId: string, type: 'cheer' | 'emoji', payload: string) {
    if (profile) sendInteraction(profile.id, menteeId, type, payload)
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <span className="hbar-ttl">TrainerSync <span className="t-c">Coach</span></span>
          <div className="hbar-actions">
            <span className="hbar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
          </div>
        </div>

        <div className="content">

          {/* Coach profile card */}
          <div className="card">
            <div className="row" style={{ gap:13 }}>
              <div className="avatar av-lg av-coach">{initial}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>{profile?.username ?? 'Coach'}</div>
                <div className="fs11 t-c">Certified Coach ✅</div>
                <div className="row" style={{ gap:18, marginTop:9 }}>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:17, fontWeight:700 }}>{mentees.length}</div><div className="fs10 t-m">Mentees</div></div>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:17, fontWeight:700, color:'var(--green)' }}>{activePresences.length}</div><div className="fs10 t-m">Active now</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active mentees (real-time) */}
          {activePresences.length > 0 && (
            <div className="card">
              <div className="card-ttl">Active Now ({activePresences.length})</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {activePresences.map(p => {
                  const mentee  = mentees.find(m => m.id === p.trainee_id)
                  const name    = mentee?.username ?? p.trainee_id.slice(0, 8)
                  const init    = name.slice(0, 2).toUpperCase()
                  const status  = `${p.exercise_name ?? 'Training'} · ${p.current_set}/5`
                  const detail  = `${p.current_hr}bpm`
                  return (
                    <div key={p.trainee_id} className="list-item">
                      <div className="row-between" style={{ marginBottom:6 }}>
                        <div className="row">
                          <div className="avatar av-md">{init}</div>
                          <div>
                            <div className="fs13 fw6">{name}</div>
                            <div className={`fs11 ${hrZoneClass(p.current_hr)}`}>{status}</div>
                            <div className="fs11 t-m">{detail}</div>
                          </div>
                        </div>
                      </div>
                      <div className="row-between">
                        <div className="int-btns">
                          <div className="int-btn" onClick={() => navigate('/coach/chat/' + p.trainee_id)}>💬</div>
                          <div className="int-btn" onClick={() => handleSendInteraction(p.trainee_id, 'emoji', '💪')}>💪</div>
                          <div className="int-btn" onClick={() => handleSendInteraction(p.trainee_id, 'emoji', '🔥')}>🔥</div>
                        </div>
                        <span className="t-c fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/mentee/' + p.trainee_id)}>Detail →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All mentees */}
          {mentees.length > 0 ? (
            <div className="card">
              <div className="card-ttl">All Mentees</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {mentees.map(m => {
                  const p    = presences.find(x => x.trainee_id === m.id)
                  const init = (m.username ?? 'U').slice(0, 2).toUpperCase()
                  const isActive = !!p
                  return (
                    <div key={m.id} className="list-item">
                      <div className="row-between" style={{ marginBottom:6 }}>
                        <div className="row">
                          <div className="avatar av-md">{init}</div>
                          <div>
                            <div className="fs13 fw6">{m.username}</div>
                            <div className={`fs11 ${isActive ? hrZoneClass(p!.current_hr) : 't-m'}`}>
                              {isActive ? `${p!.exercise_name ?? 'Training'} · ${p!.current_hr}bpm` : 'Offline'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="row-between">
                        <div className="int-btns">
                          <div className="int-btn" onClick={() => navigate('/coach/chat/' + m.id)}>💬</div>
                          {isActive && <div className="int-btn" onClick={() => handleSendInteraction(m.id, 'emoji', '💪')}>💪</div>}
                        </div>
                        <span className="t-c fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/mentee/' + m.id)}>Detail →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Fallback static demo */
            <div className="card">
              <div className="card-ttl">Active Mentees</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { init:'XM', name:'Xiao Ming', status:'Training · Bench Press · 3/5', detail:'142bpm · 18min', cls:'t-g' },
                  { init:'XH', name:'Xiao Hong', status:'High HR · Squat · 4/5',        detail:'162bpm · 35min', cls:'t-r' },
                  { init:'XG', name:'Xiao Gang', status:'Resting between sets',          detail:'98bpm · 22min',  cls:'t-b' },
                ].map(m => (
                  <div key={m.init} className="list-item">
                    <div className="row-between" style={{ marginBottom:6 }}>
                      <div className="row">
                        <div className="avatar av-md">{m.init}</div>
                        <div>
                          <div className="fs13 fw6">{m.name}</div>
                          <div className={`fs11 ${m.cls}`}>{m.status}</div>
                          <div className="fs11 t-m">{m.detail}</div>
                        </div>
                      </div>
                    </div>
                    <div className="row-between">
                      <div className="int-btns">
                        <div className="int-btn" onClick={() => navigate('/coach/chat/'+m.init)}>💬</div>
                        <div className="int-btn">💪</div>
                        <div className="int-btn">🔥</div>
                      </div>
                      <span className="t-c fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/mentee/'+m.init)}>Detail →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <BottomNav />
      </div>
    </>
  )
}
