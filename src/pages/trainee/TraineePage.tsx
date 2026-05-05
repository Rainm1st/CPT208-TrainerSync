import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { usePresenceStore } from '../../store/presenceStore'
import { BottomNav } from '../../components/BottomNav'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtDuration(s: number | null) {
  return s ? `${Math.round(s / 60)} min` : '—'
}

export default function TraineePage() {
  const { profile }  = useAuthStore()
  const { recentSessions, fetchRecent } = useSessionStore()
  const { presences, fetchAll, subscribe } = usePresenceStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (profile) fetchRecent(profile.id)
    fetchAll()
    const unsub = subscribe()
    return unsub
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const weekCount  = recentSessions.filter(s => s.started_at >= oneWeekAgo).length
  const display    = recentSessions.slice(0, 2)

  // Active buddies (exclude self)
  const buddies = presences.filter(p => p.trainee_id !== profile?.id).slice(0, 5)

  function hrColor(bpm: number | null) {
    if (!bpm) return 'var(--mu)'
    return bpm > 150 ? 'var(--red)' : bpm > 120 ? 'var(--green)' : 'var(--z-blue)'
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>

        <div className="hbar" style={{ borderBottom:0, paddingBottom:4 }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'1.3rem', margin:0, fontWeight:900, letterSpacing:'.01em' }}>
            <span style={{ color:'var(--tx)' }}>TRAINER</span><span style={{ color:'var(--brand)' }}>SYNC</span>
          </div>
          <div className="hbar-actions">
            <span className="hbar-icon" style={{ color:'var(--mu)', position:'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
            <span className="hbar-icon" onClick={() => navigate('/profile')} style={{ color:'var(--mu)', cursor:'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </span>
          </div>
        </div>

        <div className="content" style={{ gap:20, paddingTop:4 }}>

          {/* Hero stats block */}
          <div style={{ padding:'0 2px' }}>
            <div style={{ fontSize:13, color:'var(--mu)', marginBottom:14 }}>
              Good session, {profile?.username ?? 'Athlete'}
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:10, marginBottom:6 }}>
              <div className="hero-num">{weekCount || recentSessions.length || '—'}</div>
              <div style={{ paddingBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--tx)' }}>sessions</div>
                <div style={{ fontSize:11, color:'var(--mu)' }}>this week</div>
              </div>
            </div>
            <div className="level-bar-wrap">
              <div className="level-bar-track"><div className="level-bar-fill" style={{ width:`${Math.min(100, weekCount * 15)}%` }} /></div>
              <span className="level-tag">Lv.{recentSessions.length + 1}</span>
            </div>
            <div className="stat-row" style={{ marginTop:16 }}>
              <div className="stat-col">
                <div className="stat-val">{display[0]?.duration_s ? Math.round(display[0].duration_s / 60) : '—'}</div>
                <div className="stat-unit">min today</div>
              </div>
              <div className="stat-col">
                <div className="stat-val lime">{display[0]?.avg_hr ?? '—'}</div>
                <div className="stat-unit">avg bpm</div>
              </div>
              <div className="stat-col">
                <div className="stat-val">{display[0]?.sets_done ?? '—'}</div>
                <div className="stat-unit">sets done</div>
              </div>
            </div>
          </div>

          {/* Start session button */}
          <button
            className="btn-primary"
            style={{ fontSize:15, padding:14, letterSpacing:'.05em', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
            onClick={() => navigate('/exercise')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
              <path d="M2 8h1a4 4 0 0 1 0 8H2"/>
              <line x1="6" y1="12" x2="18" y2="12"/>
              <path d="M6 8v8"/><path d="M18 8v8"/>
            </svg>
            START SESSION
          </button>

          {/* Nearby Now */}
          <div>
            <div className="row-between" style={{ marginBottom:10 }}>
              <div className="sec-lbl" style={{ marginBottom:0 }}>Nearby Now {buddies.length > 0 && `(${buddies.length})`}</div>
              <span className="t-b fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/buddies')}>Map →</span>
            </div>
            {buddies.length > 0 ? (
              <div className="buddy-strip">
                {buddies.map(p => {
                  const init = (p.profiles?.username ?? p.trainee_id).slice(0, 2).toUpperCase()
                  const hr   = p.current_hr
                  const ring = hr > 150 ? 'var(--z-red)' : hr > 110 ? 'var(--z-green)' : 'var(--brand)'
                  const statusCls = hr > 150 ? 'high' : hr < 100 ? 'rest' : ''
                  const status = p.exercise_name ?? 'Active'
                  return (
                    <div key={p.trainee_id} className="buddy-chip" onClick={() => navigate('/buddy/' + p.trainee_id)}>
                      <div className="avatar-wrap online">
                        <div className="online-ring" style={{ borderColor:ring }} />
                        <div className="avatar av-md">{init}</div>
                      </div>
                      <div className="buddy-chip-name">{p.profiles?.username ?? init}</div>
                      <div className={`buddy-chip-status${statusCls ? ' '+statusCls : ''}`}>{status}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="buddy-strip">
                {[
                  { init:'XM', name:'Xiao Ming', status:'Bench 3/5', ring:'var(--z-green)' },
                  { init:'XH', name:'Xiao Hong', status:'High HR',   ring:'var(--red)',    cls:'high' },
                  { init:'XG', name:'Xiao Gang', status:'Resting',   ring:'var(--brand)',  cls:'rest' },
                ].map(b => (
                  <div key={b.init} className="buddy-chip" onClick={() => navigate('/buddies')}>
                    <div className="avatar-wrap online">
                      <div className="online-ring" style={{ borderColor:b.ring }} />
                      <div className="avatar av-md">{b.init}</div>
                    </div>
                    <div className="buddy-chip-name">{b.name}</div>
                    <div className={`buddy-chip-status${(b as any).cls ? ' '+(b as any).cls : ''}`}>{b.status}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div>
            <div className="row-between" style={{ marginBottom:10 }}>
              <div className="sec-lbl" style={{ marginBottom:0 }}>Recent</div>
              <span className="t-b fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/profile')}>All →</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {display.length > 0 ? display.map(s => (
                <div key={s.id} className="list-item" onClick={() => navigate('/summary', { state: { sessionId: s.id } })} style={{ cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)' }}>{s.exercise_name}</div>
                    <div style={{ fontSize:11, color:'var(--mu)', marginTop:2 }}>{fmtDate(s.started_at)} · {fmtDuration(s.duration_s)}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:hrColor(s.avg_hr) }}>{s.avg_hr ?? '—'} bpm</div>
                    <div style={{ fontSize:10, color:'var(--mu)' }}>avg HR</div>
                  </div>
                </div>
              )) : (
                <div className="list-item" style={{ padding:'12px 14px', color:'var(--mu)', fontSize:13, textAlign:'center' }}>
                  No sessions yet — start your first!
                </div>
              )}
            </div>
          </div>

        </div>

        <BottomNav />
      </div>
    </>
  )
}
