import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { usePresenceStore } from '../../store/presenceStore'
import { BottomNav } from '../../components/BottomNav'
import { useTheme } from '../../hooks/useTheme'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' })
}
function fmtDuration(s: number | null) {
  return s ? `${Math.round(s / 60)} min` : '—'
}
function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function rand(n: number) { return Math.floor(Math.random() * n) }

// ── Announcement data ──────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  { emoji:'✨', tag:'New Feature', tint:'65,120,255',   title:'Breathing Light',      body:'Your background now pulses with your heart rate 🌊 — blue warming up, green in the zone, red when pushing hard. Pretty cool right? Try it next session!', date:'May 8' },
  { emoji:'📣', tag:'Community',   tint:'20,184,166',   title:'80% Trainers Onboard', body:'Big milestone! 🎉 8 out of 10 of our trainers are now on TrainerSync. Say hi, ask for tips, or just connect — they\'re all here and happy to help.', date:'May 8' },
  { emoji:'🔥', tag:'Challenge',   tint:'245,158,11',   title:'Summer Shred',         body:'30 days, one mission 🔥 Our guided summer programme kicks off Jun 1. Workouts, nutrition tips & weekly check-ins included. Spots are limited — grab yours!', date:'May 7' },
  { emoji:'💆', tag:'New Service', tint:'132,204,22',   title:'Recovery Suite Open',  body:'The new recovery lounge is open on Level 2 ✨ Foam rollers, massage guns, stretch mats — take 15 mins post-session. Your muscles will thank you 🙏', date:'May 6' },
  { emoji:'🎁', tag:'Offer',       tint:'251,191,36',   title:'Refer & Earn',         body:'Know someone who should be training? 👀 Refer a friend and you both win — 1 month free for you, a warm welcome for them. Find your code in Profile!', date:'May 5' },
  { emoji:'🌟', tag:'Community',   tint:'168,85,247',   title:'Exam Season',          body:'We know it\'s crunch time 📚 Our Tue & Thu 7pm energy sessions are built to clear your head and keep you moving. One hour, full reset. See you there 💪', date:'May 4' },
  { emoji:'🤝', tag:'Event',       tint:'20,184,166',   title:'Open Gym Day',         body:'This Saturday, 9am–12pm — the gym is yours 🏋️ Free open session, no booking needed. Bring a friend, try new equipment, have fun. Everyone\'s welcome!', date:'May 3' },
]

// ── AI tip pool (20) ───────────────────────────────────────────────────────
const TIPS = [
  'Drop sets in your final round boost muscle fatigue and growth signals.',
  'Slow the negative phase to 3–4s for more time under tension.',
  'Superset opposing muscles to cut rest time and save 15+ min.',
  'Breathe out on exertion, inhale on the way back.',
  'Progressive overload: add 2.5 kg every 2 weeks to keep adapting.',
  'Warm up with 50% of working weight for 2 sets before heavy lifts.',
  'Deload week every 6–8 weeks prevents plateau and reduces injury risk.',
  'Compound lifts first, isolation after — you\'ll have more power.',
  'Log your weights every session — consistency shows up in the data.',
  'Mind-muscle connection: squeeze the target muscle at peak contraction.',
  'Sleep is training. 7–9h accelerates recovery more than any supplement.',
  'Hydrate before you\'re thirsty — dehydration cuts strength by ~10%.',
  'Tempo training (3-1-1) builds control and reduces injury on heavy sets.',
  'Active recovery: a 20-min walk after training clears lactate faster.',
  'Pre-workout carbs 30–60 min before session improve peak performance.',
  'Protein sweet spot: 1.6–2.2 g per kg bodyweight per day.',
  'Rest between sets: 2–3 min for strength, 60–90s for hypertrophy.',
  'Grip strength is a proxy for overall pulling strength — train it directly.',
  'Vary rep ranges: heavy (3–5), moderate (8–12), and light (15–20).',
  'Foam roll before warming up — it improves range of motion for free.',
]

// ── AI next-session pool (20) ──────────────────────────────────────────────
const NEXTS = [
  'Chest day: Bench → Incline DB → Cable Fly. 3×10 each.',
  'Back pull: Deadlift, Barbell Row, Lat Pulldown. Classic.',
  'Leg day: Squat, Romanian Deadlift, Leg Press. 4×8.',
  'Shoulder session: OHP, Lateral Raise, Face Pull.',
  'Arms: EZ Curl, Skull Crusher, Hammer Curl, Tricep Dip.',
  'Core circuit: Plank 60s, Ab Wheel, Dead Bug — 3 rounds.',
  'Upper-lower split: push all upper today, save legs for tomorrow.',
  'Full body power: Deadlift, Bench, Pull-up. Keep intensity high.',
  'Recovery: light cardio 20 min + full body foam roll.',
  'Try something new — Cable Fly or Incline Press if not yet done.',
  'Repeat last week\'s best session. Beat it by 1 rep or 2.5 kg.',
  'Superset day: Bench + Row, Squat + Press, Curl + Extension.',
  'Cardio + Abs: 20 min treadmill then 3×15 crunches, leg raise, plank.',
  'Back & Biceps: Barbell Row, Seated Row, Pulldown, DB Curl.',
  'Chest & Triceps: Bench, Dips, Close-grip Bench, Cable Pushdown.',
  'Leg & Glute focus: Hip Thrust, Bulgarian Split Squat, Leg Curl.',
  'Olympic warm-up: clean & press with empty bar, 5×5.',
  'Mobility day: hip 90/90, thoracic rotation, shoulder dislocates.',
  'Intensity booster: reduce rest to 60s on last 2 sets of each exercise.',
  'AMRAP finisher: pick your weakest exercise, max reps in 5 min.',
]

export default function TraineePage() {
  const { profile }  = useAuthStore()
  const { recentSessions, fetchRecent } = useSessionStore()
  const { presences, fetchAll, subscribe } = usePresenceStore()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const [tipIdx,      setTipIdx]      = useState(() => rand(TIPS.length))
  const [nextIdx,     setNextIdx]     = useState(() => rand(NEXTS.length))
  const [selectedAnn, setSelectedAnn] = useState(0)

  useEffect(() => {
    if (profile) fetchRecent(profile.id)
    fetchAll()
    const unsub = subscribe()
    return unsub
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const weekCount  = recentSessions.filter(s => s.started_at >= oneWeekAgo).length
  const display    = recentSessions.slice(0, 2)
  const totalMin   = recentSessions
    .filter(s => s.started_at >= oneWeekAgo)
    .reduce((sum, s) => sum + Math.round((s.duration_s ?? 0) / 60), 0)

  const buddies = presences.filter(p => p.trainee_id !== profile?.id).slice(0, 6)

  const STATIC_BUDDIES = [
    { init:'XM', name:'Xiao Ming', status:'Bench Press', ring:'var(--z-green)', tint:'34,197,94',  live:true  },
    { init:'XH', name:'Xiao Hong', status:'High HR',     ring:'var(--z-red)',   tint:'239,68,68',  live:true  },
    { init:'XG', name:'Xiao Gang', status:'Resting',     ring:'var(--brand)',   tint:'65,120,255', live:false },
    { init:'XL', name:'Xiao Li',   status:'Treadmill',   ring:'var(--z-green)', tint:'34,197,94',  live:true  },
  ]

  function buddyRing(hr: number) {
    return hr > 150 ? 'var(--z-red)' : hr > 110 ? 'var(--z-green)' : 'var(--brand)'
  }
  function buddyTint(hr: number) {
    return hr > 150 ? '239,68,68' : hr > 110 ? '34,197,94' : '65,120,255'
  }

  function cycleTip() {
    setTipIdx(i => { let n = rand(TIPS.length - 1); if (n >= i) n++; return n })
  }
  function cycleNext() {
    setNextIdx(i => { let n = rand(NEXTS.length - 1); if (n >= i) n++; return n })
  }

  const buddyCardEnd = theme === 'light' ? 'rgba(239,232,223,0.75)' : 'rgba(15,30,53,0.55)'

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1, height:'100vh', overflow:'hidden' }}>

        {/* Header */}
        <div className="hbar" style={{ borderBottom:0, paddingBottom:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="theme-toggle-btn" onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:'1.65rem', fontWeight:900, letterSpacing:'.01em' }}>
              <span className="brand-primary">TRAINER</span><span className="brand-lime">SYNC</span>
            </div>
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

        <div className="content" style={{ gap:14, paddingTop:4 }}>

          {/* ── Hero stats — UNCHANGED ── */}
          <div style={{ padding:'0 2px' }}>
            <div style={{ fontSize:11, color:'var(--mu)', marginBottom:12 }}>
              {timeGreeting()}, <span style={{ fontWeight:600 }}>{profile?.username ?? 'Athlete'}</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:10, marginBottom:6 }}>
              <div className="hero-num">{weekCount || recentSessions.length || '—'}</div>
              <div style={{ paddingBottom:10 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--tx)' }}>sessions</div>
                <div style={{ fontSize:10, color:'var(--mu)' }}>this week</div>
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

          {/* ── START SESSION — UNCHANGED ── */}
          <button
            className="btn-primary"
            style={{ fontSize:17, padding:'16px 14px', letterSpacing:'.06em', display:'flex', alignItems:'center', justifyContent:'center', gap:9 }}
            onClick={() => navigate('/exercise')}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
              <path d="M2 8h1a4 4 0 0 1 0 8H2"/>
              <line x1="6" y1="12" x2="18" y2="12"/>
              <path d="M6 8v8"/><path d="M18 8v8"/>
            </svg>
            START SESSION
          </button>

          {/* ── Announcements (master-detail) ── */}
          <div>
            <div className="row-between" style={{ marginBottom:10 }}>
              <div className="sec-lbl" style={{ marginBottom:0, fontSize:13 }}>Gym Updates</div>
              <span style={{ fontSize:10, color:'var(--mu)', textDecoration:'underline', cursor:'pointer' }}>Selected: XJTLU SIP-GM 1F</span>
            </div>
            <div style={{ display:'flex', gap:10, height:192 }}>
              {/* Featured card */}
              {(() => {
                const a = ANNOUNCEMENTS[selectedAnn]
                return (
                  <div style={{
                    width:156, flexShrink:0, borderRadius:14, padding:'12px 11px 10px',
                    background:`rgba(${a.tint},0.09)`,
                    border:`1px solid rgba(${a.tint},0.28)`,
                    display:'flex', flexDirection:'column',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={`rgba(${a.tint},0.8)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      <span style={{ fontSize:9, color:'var(--mu)' }}>{a.date}</span>
                    </div>
                    <div style={{
                      display:'inline-block', fontSize:8, fontWeight:700, padding:'2px 6px',
                      borderRadius:5, marginBottom:7, alignSelf:'flex-start',
                      background:`rgba(${a.tint},0.18)`, color:`rgba(${a.tint},1)`,
                      letterSpacing:'0.4px', textTransform:'uppercase',
                    }}>{a.tag}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--tx)', marginBottom:5, lineHeight:1.3 }}>{a.title}</div>
                    <div style={{ fontSize:10, color:'var(--mu)', lineHeight:1.55, flex:1, overflow:'hidden' }}>{a.body}</div>
                  </div>
                )
              })()}

              {/* Scrollable brief list */}
              <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
                {ANNOUNCEMENTS.map((a, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedAnn(i)}
                    style={{
                      display:'flex', alignItems:'center', gap:8,
                      padding:'7px 9px', borderRadius:10, cursor:'pointer', flexShrink:0,
                      background: i === selectedAnn ? `rgba(${a.tint},0.13)` : 'var(--s1)',
                      border: `1px solid ${i === selectedAnn ? `rgba(${a.tint},0.38)` : 'var(--bd)'}`,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgba(${a.tint},0.8)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--tx)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.title}</div>
                      <div style={{ fontSize:9, color:'var(--mu)', marginTop:1 }}>{a.tag} · {a.date}</div>
                    </div>
                    {i === selectedAnn && <span style={{ fontSize:8, color:`rgba(${a.tint},1)`, flexShrink:0 }}>●</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Recent Connections ── */}
          <div>
            <div className="row-between" style={{ marginBottom:8 }}>
              <div className="sec-lbl" style={{ marginBottom:0, fontSize:13 }}>
                Recent Connections{buddies.length > 0 && <span style={{ color:'var(--lime)', fontWeight:700, marginLeft:5 }}>{buddies.length}</span>}
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--brand)', cursor:'pointer' }} onClick={() => navigate('/buddies')}>Map →</span>
            </div>
            <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:4 }}>
              {(buddies.length > 0 ? buddies.map(p => {
                const init = (p.profiles?.username ?? p.trainee_id).slice(0,2).toUpperCase()
                const name = p.profiles?.username ?? init
                const hr   = p.current_hr
                const ring = buddyRing(hr)
                const tint = buddyTint(hr)
                const statusCls = hr > 150 ? 'high' : hr < 100 ? 'rest' : ''
                return {
                  init, name, status: p.exercise_name ?? 'Active',
                  ring, tint, live:true, statusCls,
                  onClick: () => navigate('/buddy/' + p.trainee_id),
                }
              }) : STATIC_BUDDIES.map(b => ({
                ...b, statusCls: b.ring === 'var(--z-red)' ? 'high' : !b.live ? 'rest' : '',
                onClick: () => navigate('/buddies'),
              }))).map((b, i) => (
                <div
                  key={i}
                  onClick={b.onClick}
                  style={{
                    flexShrink:0, width:66, borderRadius:11, padding:'7px 4px 6px',
                    background:'var(--s1)',
                    border:'1px solid var(--bd)',
                    cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                    textAlign:'center',
                  }}
                >
                  <div className="avatar-wrap">
                    <div className="avatar av-sm">{b.init}</div>
                    {b.live && <div className="online-ring" style={{ borderColor:b.ring }} />}
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--tx)' }}>{b.name}</div>
                  <div
                    className={`buddy-chip-status${b.statusCls ? ' '+b.statusCls : ''}`}
                    style={{ fontSize:8, maxWidth:70, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}
                  >{b.status}</div>
                  {b.live && (
                    <div style={{
                      width:5, height:5, borderRadius:'50%',
                      background:`rgba(${b.tint},0.9)`,
                      boxShadow:`0 0 5px rgba(${b.tint},0.7)`,
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── AI Assistant ── */}
          <div className="card" style={{ padding:'12px 13px 11px' }}>
            {/* Brand header + weekly summary inline */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
              <span style={{ fontSize:26, lineHeight:1 }}>🐱</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, letterSpacing:'.02em', lineHeight:1.1 }}>
                  <span className="brand-primary">TRAINER</span><span className="brand-lime">SYNC</span>
                </div>
                <div style={{ fontSize:8, color:'var(--mu)', letterSpacing:'1px', textTransform:'uppercase', marginTop:1 }}>Intelligent Assistant</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--lime)', lineHeight:1 }}>
                  {weekCount > 0 ? weekCount : '—'}
                </div>
                <div style={{ fontSize:9, color:'var(--mu)', marginTop:2 }}>
                  {weekCount > 0 ? `${totalMin} min · this week` : 'No sessions yet'}
                </div>
              </div>
            </div>

            {/* Tip + Next — clickable tiles */}
            <div style={{ display:'flex', gap:8 }}>
              {/* 💡 Tip */}
              <div
                onClick={cycleTip}
                style={{
                  flex:1, padding:'9px 10px', borderRadius:11, cursor:'pointer', position:'relative',
                  background:'rgba(65,120,255,0.08)',
                  border:'1px solid rgba(65,120,255,0.25)',
                  boxShadow:'0 2px 8px rgba(65,120,255,0.10)',
                  transition:'transform 0.12s, box-shadow 0.12s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform='scale(0.97)')}
                onMouseUp={e => (e.currentTarget.style.transform='')}
                onTouchStart={e => (e.currentTarget.style.transform='scale(0.97)')}
                onTouchEnd={e => (e.currentTarget.style.transform='')}
              >
                <div style={{ position:'absolute', top:6, right:7, fontSize:9, color:'rgba(65,120,255,0.55)', fontWeight:700 }}>↻</div>
                <div style={{ marginBottom:5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(65,120,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                    <path d="M9 18h6"/><path d="M10 22h4"/>
                  </svg>
                </div>
                <div style={{ fontSize:10, lineHeight:1.5, color:'var(--tx)' }}>{TIPS[tipIdx]}</div>
              </div>

              {/* 🎯 Next */}
              <div
                onClick={cycleNext}
                style={{
                  flex:1, padding:'9px 10px', borderRadius:11, cursor:'pointer', position:'relative',
                  background:'rgba(245,158,11,0.08)',
                  border:'1px solid rgba(245,158,11,0.25)',
                  boxShadow:'0 2px 8px rgba(245,158,11,0.08)',
                  transition:'transform 0.12s, box-shadow 0.12s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform='scale(0.97)')}
                onMouseUp={e => (e.currentTarget.style.transform='')}
                onTouchStart={e => (e.currentTarget.style.transform='scale(0.97)')}
                onTouchEnd={e => (e.currentTarget.style.transform='')}
              >
                <div style={{ position:'absolute', top:6, right:7, fontSize:9, color:'rgba(245,158,11,0.55)', fontWeight:700 }}>↻</div>
                <div style={{ marginBottom:5 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="6"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <div style={{ fontSize:10, lineHeight:1.5, color:'var(--tx)' }}>{NEXTS[nextIdx]}</div>
              </div>
            </div>
          </div>

        </div>

        <BottomNav />
      </div>
    </>
  )
}
