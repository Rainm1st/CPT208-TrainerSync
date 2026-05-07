import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePresenceStore } from '../../store/presenceStore'
import { BottomNav } from '../../components/BottomNav'
import { GymFloorPlan } from '../../components/GymFloorPlan'
import type { GymDot } from '../../components/GymFloorPlan'

const STATIC_DOTS: GymDot[] = [
  { id: 'xm',  x: 0.30, y: 0.45, initials: 'XM',  color: 'var(--z-green)' },
  { id: 'xh',  x: 0.58, y: 0.62, initials: 'XH',  color: 'var(--z-red)'   },
  { id: 'xg',  x: 0.72, y: 0.28, initials: 'XG',  color: 'var(--z-blue)'  },
  { id: 'you', x: 0.42, y: 0.55, initials: 'YOU', color: 'var(--brand)', isYou: true },
]

const FALLBACK_POS = [
  { x: 0.30, y: 0.45 }, { x: 0.58, y: 0.62 }, { x: 0.72, y: 0.28 },
  { x: 0.25, y: 0.70 }, { x: 0.65, y: 0.40 }, { x: 0.45, y: 0.20 },
]

const FILTERS = ['All', 'Friends', 'Same Ex.', '10m']

export default function BuddiesPage() {
  const [filter, setFilter] = useState('All')
  const [burst, setBurst]   = useState<string | null>(null)
  const navigate = useNavigate()

  const { profile }                                = useAuthStore()
  const { presences, fetchAll, subscribe } = usePresenceStore()

  useEffect(() => {
    fetchAll()
    const unsub = subscribe()
    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function sendBurst(e: string) { setBurst(e); setTimeout(() => setBurst(null), 800) }

  const buddies = presences.filter(p => p.trainee_id !== profile?.id)

  function hrZoneClass(hr: number) {
    if (hr > 150) return 't-r'
    if (hr > 110) return 't-g'
    return 't-b'
  }
  function hrZoneEmoji(hr: number) {
    if (hr > 150) return '❤️'
    if (hr > 110) return '💚'
    return '💙'
  }
  function dotColor(hr: number) {
    if (hr > 150) return 'var(--z-red)'
    if (hr > 110) return 'var(--z-green)'
    return 'var(--z-blue)'
  }

  const showReal = buddies.length > 0

  const youDot: GymDot = {
    id: 'you', x: 0.42, y: 0.55,
    initials: 'YOU', color: 'var(--brand)', isYou: true,
  }
  const mapDots: GymDot[] = showReal
    ? [youDot, ...buddies.slice(0, 6).map((p, i) => ({
        id: p.trainee_id,
        x: p.gym_x ?? FALLBACK_POS[i % FALLBACK_POS.length].x,
        y: p.gym_y ?? FALLBACK_POS[i % FALLBACK_POS.length].y,
        initials: (p.profiles?.username ?? p.trainee_id).slice(0, 2).toUpperCase(),
        color: dotColor(p.current_hr),
        onClick: () => navigate('/buddy/' + p.trainee_id),
      }))]
    : STATIC_DOTS

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      {burst && (
        <div style={{ position:'fixed',inset:0,zIndex:999,pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ fontSize:80, animation:'emojiBurst 0.9s ease-out forwards' }}>{burst}</span>
        </div>
      )}

      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <span className="hbar-ttl">Buddies</span>
          <div className="hbar-actions">
            <span className="hbar-icon" style={{ cursor:'pointer' }} onClick={() => navigate('/friends')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
          </div>
        </div>

        <div className="content">
          {/* Floor plan map */}
          <div className="gym-map-container" style={{ height: 210 }}>
            <GymFloorPlan dots={mapDots} />
          </div>

          {/* Legend */}
          <div className="card" style={{ padding:'8px 10px' }}>
            <div className="row" style={{ flexWrap:'wrap', gap:8 }}>
              <span className="fs10 t-m"><span className="zone-dot" style={{ background:'var(--z-blue)', display:'inline-block', marginRight:3 }} />Resting</span>
              <span className="fs10 t-m"><span className="zone-dot" style={{ background:'var(--z-green)', display:'inline-block', marginRight:3 }} />Training</span>
              <span className="fs10 t-m"><span className="zone-dot" style={{ background:'var(--z-red)', display:'inline-block', marginRight:3 }} />High HR</span>
            </div>
          </div>

          {/* Filter chips */}
          <div className="chips">
            {FILTERS.map(f => (
              <button key={f} className={`chip${filter===f?' on':''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>

          {/* Buddy list */}
          <div className="card" style={{ padding:'10px 12px' }}>
            <div className="fs11 fw6" style={{ marginBottom:8 }}>
              In the Gym ({showReal ? buddies.length : 3})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:280, overflowY:'auto' }}>
              {showReal ? buddies.map(p => {
                const init = (p.profiles?.username ?? p.trainee_id).slice(0, 2).toUpperCase()
                const name = p.profiles?.username ?? init
                const hr   = p.current_hr
                const ex   = p.exercise_name ?? 'Active'
                return (
                  <div key={p.trainee_id} className="list-item" style={{ cursor:'pointer', padding:'8px 10px' }}>
                    <div className="row" style={{ gap:8, marginBottom:6 }} onClick={() => navigate('/buddy/' + p.trainee_id)}>
                      <div className="avatar av-md">{init}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="fs12 fw6">{name} <span style={{ fontSize:14 }}>{hrZoneEmoji(hr)}</span></div>
                        <div className="fs10 t-m">~nearby · <span className={hrZoneClass(hr)}>{ex} · {hr} bpm</span></div>
                      </div>
                    </div>
                    <div className="int-btns">
                      <div className="int-btn" onClick={() => navigate('/buddy/' + p.trainee_id)}>💬</div>
                      <div className="int-btn" onClick={() => sendBurst('💪')}>💪</div>
                      <div className="int-btn" onClick={() => sendBurst('🔥')}>🔥</div>
                    </div>
                  </div>
                )
              }) : [
                { init:'XM', name:'Xiao Ming', star:true,  dist:'5m',  ex:'Bench Press · 3/5', status:'t-g', emoji:'💚' },
                { init:'XH', name:'Xiao Hong', star:false, dist:'12m', ex:'Squat · High HR',   status:'t-r', emoji:'❤️' },
                { init:'XG', name:'Xiao Gang', star:false, dist:'25m', ex:'Lat Pulldown · Resting', status:'t-b', emoji:'💙' },
              ].map(b => (
                <div key={b.init} className="list-item" style={{ cursor:'pointer', padding:'8px 10px' }}>
                  <div className="row" style={{ gap:8, marginBottom:6 }}>
                    <div className="avatar av-md">{b.init}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="fs12 fw6">{b.name}{b.star?' ⭐':''} <span style={{ fontSize:14 }}>{b.emoji}</span></div>
                      <div className="fs10 t-m">{b.dist} · <span className={b.status}>{b.ex}</span></div>
                    </div>
                  </div>
                  <div className="int-btns">
                    <div className="int-btn" onClick={() => sendBurst('💪')}>💪</div>
                    <div className="int-btn" onClick={() => sendBurst('🔥')}>🔥</div>
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
