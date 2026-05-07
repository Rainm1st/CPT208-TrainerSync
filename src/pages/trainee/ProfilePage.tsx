import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { useSocialStore } from '../../store/socialStore'
import { BottomNav } from '../../components/BottomNav'
import type { Session } from '../../lib/types'
import { seedDemoSessions } from '../../lib/seedDemoSessions'

const ACHIEVEMENTS = [
  { medal:'🥇', title:'PR Bench', sub:'100 kg' },
  { medal:'🏅', title:'14-Day Streak', sub:'Consistent' },
  { medal:'🥈', title:'Century Club', sub:'100 sessions' },
  { medal:'⚡', title:'Speed Run', sub:'Under 30 min' },
]

const DAY_LABELS = ['M','T','W','T','F','S','S']

function buildWeekBars(sessions: Session[]) {
  const now      = Date.now()
  const totals   = Array(7).fill(0) // Mon=0 … Sun=6
  for (const s of sessions) {
    const diffDays = Math.floor((now - new Date(s.started_at).getTime()) / 86400000)
    if (diffDays > 6) continue
    const idx = (new Date(s.started_at).getDay() + 6) % 7 // Sun→6, Mon→0
    totals[idx] += (s.duration_s ?? 0) / 60 // minutes
  }
  const maxMin = Math.max(...totals, 1)
  return DAY_LABELS.map((day, i) => ({
    day,
    h: totals[i] > 0 ? Math.max(4, Math.round((totals[i] / maxMin) * 35)) : 3,
    active: totals[i] > 0,
  }))
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}

function fmtDuration(s: number | null) {
  return s ? `${Math.round(s / 60)}min` : '—'
}

function hrColor(bpm: number | null) {
  if (!bpm) return 'var(--mu)'
  return bpm > 150 ? 'var(--red)' : bpm > 120 ? 'var(--green)' : 'var(--z-blue)'
}

export default function ProfilePage() {
  const navigate  = useNavigate()
  const { profile, signOut }    = useAuthStore()
  const { recentSessions, fetchRecent } = useSessionStore()
  const { friends, fetchFriends }       = useSocialStore()
  const [seedMsg, setSeedMsg] = useState<string | null>(null)

  const initials = (profile?.username ?? 'U').slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!profile) return
    fetchRecent(profile.id)
    fetchFriends(profile.id)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSeed() {
    if (!profile) return
    setSeedMsg('Seeding…')
    const msg = await seedDemoSessions(profile.id)
    fetchRecent(profile.id)
    setSeedMsg(msg)
    setTimeout(() => setSeedMsg(null), 4000)
  }

  const totalSec = recentSessions.reduce((sum, s) => sum + (s.duration_s ?? 0), 0)
  const totalH   = Math.round(totalSec / 3600)

  const oneWeekAgo = useMemo(() => new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(), [])
  const weekCount  = recentSessions.filter(s => s.started_at >= oneWeekAgo).length
  const weekBars   = useMemo(() => buildWeekBars(recentSessions), [recentSessions])

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <span className="hbar-ttl">Profile</span>
        </div>

        <div className="content">

          {/* Hero card */}
          <div className="card" style={{ padding:'12px 14px' }}>
            <div className="row" style={{ gap:13 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div className="avatar av-lg">{initials}</div>
                <div style={{ position:'absolute', bottom:-2, right:-2, background:'var(--brand)', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>{profile?.username ?? '—'}</div>
                <div className="fs11 t-m" style={{ marginBottom:7 }}>
                  Lv.{Math.max(1, recentSessions.length)} · Gym Enthusiast · 🔥 {weekCount}-day streak
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
                  <div className="pstat" style={{ cursor:'pointer' }} onClick={() => navigate('/friends')}>
                    <strong>{friends.length}</strong><span>Friends</span>
                  </div>
                  <div className="pstat">
                    <strong>{recentSessions.length}</strong><span>Sessions</span>
                  </div>
                  <div className="pstat">
                    <strong>{totalH > 0 ? `${totalH}h` : '—'}</strong><span>Total</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Coach row */}
            <div style={{ marginTop:10, paddingTop:9, borderTop:'1px solid var(--bd)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div className="row" style={{ gap:7 }}>
                <div className="avatar av-sm av-coach">CW</div>
                <div>
                  <div className="fs11 fw6">Coach Wang</div>
                  <div className="fs10 t-m">Certified Coach</div>
                </div>
              </div>
              <span className="badge-pill" style={{ background:'var(--brand-t)', color:'var(--brand)', border:'1px solid rgba(65,120,255,0.3)' }}>Active plan</span>
            </div>
          </div>

          {/* This Week bar chart — real data */}
          <div className="card" style={{ padding:'10px 13px' }}>
            <div className="row-between" style={{ marginBottom:8 }}>
              <div className="card-ttl" style={{ marginBottom:0, fontSize:12 }}>This Week</div>
              <span className="fs10 t-m">{weekCount} session{weekCount !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:42 }}>
              {weekBars.map((b, i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{
                    width:'100%',
                    background: b.active ? 'var(--brand)' : 'var(--s1)',
                    borderRadius:'3px 3px 0 0',
                    height: b.h,
                    transition: 'height 0.4s ease',
                  }} />
                  <span className="fs9 t-m">{b.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="card" style={{ padding:'10px 13px' }}>
            <div className="row-between" style={{ marginBottom:7 }}>
              <div className="card-ttl" style={{ marginBottom:0, fontSize:12 }}>Achievements</div>
              <span className="t-b fs10">All →</span>
            </div>
            <div className="p4-achieve-grid">
              {ACHIEVEMENTS.map(a => (
                <div key={a.title} className="p4-achieve-cell">
                  <span className="p4-achieve-medal">{a.medal}</span>
                  <div>
                    <div className="p4-achieve-title">{a.title}</div>
                    <div className="p4-achieve-sub">{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sessions — real data */}
          <div className="card" style={{ padding:'10px 13px' }}>
            <div className="row-between" style={{ marginBottom:7 }}>
              <div className="card-ttl" style={{ marginBottom:0, fontSize:12 }}>Recent Sessions</div>
              <span className="t-b fs10">All →</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {recentSessions.length === 0 ? (
                <div className="t-m fs11" style={{ textAlign:'center' }}>No sessions yet — start your first!</div>
              ) : recentSessions.slice(0, 5).map(s => (
                <div
                  key={s.id}
                  className="list-item fs12"
                  style={{ cursor:'pointer', padding:'7px 9px' }}
                  onClick={() => navigate('/summary', { state: { sessionId: s.id } })}
                >
                  📅 {fmtDate(s.started_at)} · {fmtDuration(s.duration_s)} · {s.exercise_name} · <span style={{ color:hrColor(s.avg_hr) }}>{s.avg_hr ?? '—'} bpm</span>
                </div>
              ))}
            </div>
          </div>

          {/* Account actions */}
          <div style={{ display:'flex', flexDirection:'column', gap:7, paddingBottom:4 }}>
            <button
              className="btn-ghost"
              style={{ width:'100%', padding:'11px 14px', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8 }}
              onClick={handleSeed}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Generate Demo Data
              {seedMsg && <span style={{ marginLeft:'auto', fontSize:11, color:'var(--lime)' }}>{seedMsg}</span>}
            </button>
            <button
              className="btn-ghost"
              style={{ width:'100%', padding:'11px 14px', fontSize:13, textAlign:'left', display:'flex', alignItems:'center', gap:8, color:'var(--z-red)', borderColor:'rgba(239,68,68,0.3)' }}
              onClick={signOut}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign Out
            </button>
          </div>

        </div>

        <BottomNav />
      </div>
    </>
  )
}
