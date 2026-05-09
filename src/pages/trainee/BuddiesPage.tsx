import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePresenceStore } from '../../store/presenceStore'
import { BottomNav } from '../../components/BottomNav'
import { GymFloorPlan } from '../../components/GymFloorPlan'
import type { ZoneCount } from '../../components/GymFloorPlan'
import { type BiMsg, type MsgTab, GYM_TAB_LABEL, getMsgList } from '../../lib/gymMessages'
import { useTheme } from '../../hooks/useTheme'

// Capacity = number of equipment drawn in the SVG floor plan
const ZONE_CAPACITY = { cardio: 6, free_weight: 6, machine: 6, stretching: 4 }
const ZONE_LABELS: Record<string, string> = {
  cardio: 'Cardio', free_weight: 'Free Weights', machine: 'Machines', stretching: 'Stretching',
}

function exerciseToZone(name: string | null): string {
  if (!name) return 'free_weight'
  const n = name.toLowerCase()
  if (/treadmill|bike|elliptical|run|cardio|row.*machine/.test(n)) return 'cardio'
  if (/machine|cable|lat pull|chest fly|leg press|leg curl|leg ext|seated/.test(n)) return 'machine'
  if (/stretch|yoga|foam|mobility|warm.?up|cool|plank|ab/.test(n)) return 'stretching'
  return 'free_weight'
}

function ringColor(hr: number) {
  if (hr > 150) return 'var(--z-red)'
  if (hr > 110) return 'var(--z-green)'
  return 'var(--z-blue)'
}

interface DisplayBuddy {
  id: string; name: string; initials: string
  hr: number; exercise: string; zone: string; live: boolean; isAnon: boolean; isCoach: boolean
}


const STATIC_BUDDIES: DisplayBuddy[] = [
  { id:'xm', name:'Xiao Ming', initials:'XM', hr:135, exercise:'Bench Press',  zone:'free_weight', live:true,  isAnon:false, isCoach:false },
  { id:'xh', name:'Xiao Hong', initials:'XH', hr:162, exercise:'Squat',        zone:'free_weight', live:true,  isAnon:false, isCoach:false },
  { id:'xl', name:'Xiao Li',   initials:'XL', hr:144, exercise:'Treadmill',    zone:'cardio',      live:true,  isAnon:false, isCoach:false },
  { id:'xg', name:'Xiao Gang', initials:'XG', hr:98,  exercise:'Lat Pulldown', zone:'machine',     live:false, isAnon:false, isCoach:false },
  { id:'xw', name:'Xiao Wang', initials:'XW', hr:121, exercise:'Yoga Stretch', zone:'stretching',  live:true,  isAnon:false, isCoach:false },
  { id:'anon1', name:'Anonymous', initials:'?', hr:148, exercise:'Bench Press', zone:'free_weight', live:true, isAnon:true, isCoach:false },
  { id:'anon2', name:'Anonymous', initials:'?', hr:133, exercise:'Deadlift',    zone:'free_weight', live:true, isAnon:true, isCoach:false },
  { id:'anon3', name:'Anonymous', initials:'?', hr:119, exercise:'Barbell Row', zone:'free_weight', live:true, isAnon:true, isCoach:false },
  { id:'anon4', name:'Anonymous', initials:'?', hr:156, exercise:'Treadmill',   zone:'cardio',      live:true, isAnon:true, isCoach:false },
  { id:'anon5', name:'Anonymous', initials:'?', hr:128, exercise:'Elliptical',  zone:'cardio',      live:true, isAnon:true, isCoach:false },
  { id:'anon6', name:'Anonymous', initials:'?', hr:104, exercise:'Bike',        zone:'cardio',      live:true, isAnon:true, isCoach:false },
  { id:'anon7', name:'Anonymous', initials:'?', hr:139, exercise:'Cable Row',   zone:'machine',     live:true, isAnon:true, isCoach:false },
  { id:'anon8', name:'Anonymous', initials:'?', hr:112, exercise:'Leg Press',   zone:'machine',     live:true, isAnon:true, isCoach:false },
  { id:'anon9', name:'Anonymous', initials:'?', hr:88,  exercise:'Yoga',        zone:'stretching',  live:true, isAnon:true, isCoach:false },
]

const STATIC_COUNTS = { cardio: 4, free_weight: 5, machine: 3, stretching: 2 }

const STRANGER_REAL_INFO: Record<string, { name: string; initials: string }> = {
  anon1: { name:'Ah Wei',    initials:'AW' },
  anon2: { name:'Mei Mei',   initials:'MM' },
  anon3: { name:'Da Bao',    initials:'DB' },
  anon4: { name:'Xiao Fang', initials:'XF' },
  anon5: { name:'Jia Jia',   initials:'JJ' },
  anon6: { name:'Xiao Pang', initials:'XP' },
  anon7: { name:'Lao Li',    initials:'LL' },
  anon8: { name:'Tie Zhu',   initials:'TZ' },
  anon9: { name:'Xiao Yun',  initials:'XY' },
}

type ConvStatus = 'pending_received' | 'pending_sent' | 'active'
interface ConvMsg  { id: number; text: string; isSelf: boolean }
interface Conversation {
  buddyId: string; buddyName: string; buddyInitials: string
  isCoach: boolean; status: ConvStatus; msgs: ConvMsg[]
}

const DEMO_INCOMING = [
  { convId:'xm', name:'Xiao Ming',  initials:'XM', textEn:'Still 3 sets to go?',    textZh:'还剩3组吗？',     isCoach:false, delay:2500  },
  { convId:'xh', name:'Xiao Hong',  initials:'XH', textEn:'🔥 Let\'s go!!',           textZh:'🔥 加油！！',      isCoach:false, delay:5500  },
  { convId:'xg', name:'Xiao Gang',  initials:'XG', textEn:'Can I work in with you?',  textZh:'我能一起练吗？',   isCoach:false, delay:9000  },
]

function IcoCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IcoX() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export default function BuddiesPage() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const fromSession = (location.state as { fromSession?: boolean } | null)?.fromSession

  const { profile }                        = useAuthStore()
  const { presences, fetchAll, subscribe } = usePresenceStore()

  const { theme, toggle } = useTheme()

  const [activeZone,    setActiveZone]    = useState<string | null>(null)
  const [conversations, setConversations] = useState<Record<string, Conversation>>({})
  const [openConvId,    setOpenConvId]    = useState<string | null>(null)
  const [freeInput,     setFreeInput]     = useState('')
  const [msgTab,        setMsgTab]        = useState<MsgTab>('HELP')
  const [armedMsg,          setArmedMsg]          = useState<BiMsg | null>(null)
  const [revealedStrangers, setRevealedStrangers] = useState<Record<string, { name: string; initials: string }>>({})
  const [acceptedToast,     setAcceptedToast]     = useState<{ name: string; initials: string } | null>(null)

  const convMsgIdRef = useRef(0)
  const convEndRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAll()
    const unsub = subscribe()
    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timers = DEMO_INCOMING.map(m =>
      setTimeout(() => {
        setConversations(prev => {
          const msg: ConvMsg = { id: convMsgIdRef.current++, text: `${m.textEn} · ${m.textZh}`, isSelf: false }
          const ex = prev[m.convId]
          if (ex) return { ...prev, [m.convId]: { ...ex, msgs: [...ex.msgs, msg] } }
          return { ...prev, [m.convId]: { buddyId: m.convId, buddyName: m.name, buddyInitials: m.initials, isCoach: m.isCoach, status: 'pending_received', msgs: [msg] } }
        })
      }, m.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    convEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations, openConvId])

  // ── Zone / presence data ─────────────────────────────────────────────────
  const realBuddies = presences.filter(p => p.trainee_id !== profile?.id)
  const hasReal     = realBuddies.length > 0

  const zoneCounts: Record<string, ZoneCount> = Object.fromEntries(
    Object.entries(ZONE_CAPACITY).map(([id, cap]) => [id, { capacity: cap, current: 0 }])
  )
  if (hasReal) {
    for (const p of presences) {
      const z = exerciseToZone(p.exercise_name)
      if (zoneCounts[z]) zoneCounts[z].current++
    }
  } else {
    for (const [id, n] of Object.entries(STATIC_COUNTS)) {
      if (zoneCounts[id]) zoneCounts[id].current = n
    }
  }

  // ── People list ──────────────────────────────────────────────────────────
  const allPersons: DisplayBuddy[] = (hasReal
    ? realBuddies.map(p => ({
        id: p.trainee_id, isAnon: false, isCoach: false,
        name:     (p.profiles?.username ?? p.trainee_id).slice(0, 12),
        initials: (p.profiles?.username ?? p.trainee_id).slice(0, 2).toUpperCase(),
        hr: p.current_hr, exercise: p.exercise_name ?? 'Active',
        zone: exerciseToZone(p.exercise_name), live: true,
      }))
    : STATIC_BUDDIES
  ).map(p => {
    const revealed = revealedStrangers[p.id]
    if (p.isAnon && revealed) return { ...p, name: revealed.name, initials: revealed.initials, isAnon: false }
    return p
  })

  const filteredPersons = allPersons.filter(p => {
    if (!activeZone) return true
    return p.zone === activeZone
  })

  const sortPriority = (p: DisplayBuddy) => {
    const s = conversations[p.id]?.status
    if (s === 'active')           return 1
    if (s === 'pending_received') return 2
    if (!p.isAnon && !s)          return 3
    if (s === 'pending_sent')     return 4
    return 5
  }
  const sortedPersons = [...filteredPersons].sort((a, b) => sortPriority(a) - sortPriority(b))

  const pendingCount  = Object.values(conversations).filter(c => c.status === 'pending_received').length
  const openConv      = openConvId ? conversations[openConvId] : null
  const openPerson    = openConvId ? allPersons.find(p => p.id === openConvId) ?? null : null
  const msgList       = getMsgList(msgTab)
  const isHiTab       = msgTab === 'HI'

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleZoneClick(zone: string) {
    setActiveZone(z => z === zone ? null : zone)
  }

  function handlePersonClick(person: DisplayBuddy) {
    setOpenConvId(person.id)
  }

  function handleSendArmed() {
    if (!openConvId || !armedMsg) return
    const person = allPersons.find(p => p.id === openConvId)
    if (!person) return
    const isStranger = person.isAnon
    const text = `${armedMsg.en} · ${armedMsg.zh}`

    setConversations(prev => {
      const existing = prev[openConvId]
      if (existing && existing.status === 'active') {
        return { ...prev, [openConvId]: { ...existing, msgs: [...existing.msgs, { id: convMsgIdRef.current++, text, isSelf: true }] } }
      }
      if (existing) return prev
      return { ...prev, [openConvId]: {
        buddyId: openConvId,
        buddyName:     isStranger ? 'Stranger' : person.name,
        buddyInitials: isStranger ? '?' : person.initials,
        isCoach: person.isCoach, status: 'pending_sent',
        msgs: [{ id: convMsgIdRef.current++, text, isSelf: true }],
      }}
    })
    setArmedMsg(null)

    if (!conversations[openConvId]) {
      const delay = isStranger ? 3000 : 7000
      setTimeout(() => {
        const realInfo    = isStranger ? STRANGER_REAL_INFO[openConvId] : null
        const realName    = realInfo?.name    ?? person.name
        const realInitials= realInfo?.initials ?? person.initials
        if (isStranger && realInfo) {
          setRevealedStrangers(prev => ({ ...prev, [openConvId]: realInfo }))
          setAcceptedToast({ name: realName, initials: realInitials })
          setTimeout(() => setAcceptedToast(null), 3500)
        }
        setConversations(prev => {
          const c = prev[openConvId]
          if (!c || c.status !== 'pending_sent') return prev
          return { ...prev, [openConvId]: { ...c, status:'active', buddyName: realName, buddyInitials: realInitials,
            msgs: [...c.msgs, { id: convMsgIdRef.current++,
              text: isStranger ? "Hi! 👋 Let's connect! · 好啊，一起练！" : 'Sure! Happy to connect 👋 · 很高兴认识！',
              isSelf: false }],
          }}
        })
      }, delay)
    }
  }

  function handleAccept(convId: string) {
    setConversations(prev => {
      const c = prev[convId]
      if (!c) return prev
      return { ...prev, [convId]: { ...c, status: 'active' } }
    })
  }

  function handleDecline(convId: string) {
    setConversations(prev => {
      const next = { ...prev }
      delete next[convId]
      return next
    })
    if (openConvId === convId) setOpenConvId(null)
  }

  function handleSendFree() {
    if (!openConvId || !freeInput.trim()) return
    setConversations(prev => {
      const c = prev[openConvId]
      if (!c) return prev
      return { ...prev, [openConvId]: { ...c, msgs: [...c.msgs, { id: convMsgIdRef.current++, text: freeInput.trim(), isSelf: true }] } }
    })
    setFreeInput('')
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />

      <style>{`
        @keyframes buddy-toast-in  { from{opacity:0;transform:translateY(-18px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes buddy-toast-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(-10px) scale(0.95)} }
        @keyframes buddy-flash     { 0%,100%{box-shadow:0 4px 24px rgba(34,197,94,0.45)} 50%{box-shadow:0 4px 36px rgba(34,197,94,0.85)} }
        .buddy-toast { animation: buddy-toast-in 0.32s cubic-bezier(.2,.8,.4,1) forwards, buddy-flash 0.7s ease-in-out infinite; }
      `}</style>

      {/* Accepted toast */}
      {acceptedToast && (
        <div style={{ position:'fixed', top:56, left:0, right:0, zIndex:300, display:'flex', justifyContent:'center', pointerEvents:'none' }}>
          <div className="buddy-toast" style={{
            background:'linear-gradient(135deg,rgba(22,163,74,0.97),rgba(16,130,60,0.97))',
            borderRadius:14, padding:'10px 16px',
            display:'flex', alignItems:'center', gap:10,
            border:'1px solid rgba(34,197,94,0.5)',
          }}>
            <div className="avatar av-sm" style={{ background:'rgba(255,255,255,0.22)', color:'#fff', fontWeight:800, flexShrink:0 }}>
              {acceptedToast.initials}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.2 }}>
                {acceptedToast.name} accepted! 👋
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)', marginTop:2 }}>
                Connected — you can now chat freely
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="app-shell" style={{ position:'relative', zIndex:1, height:'100vh', overflow:'hidden' }}>

        {/* Header */}
        <div className="hbar">
          {fromSession
            ? <button className="hbar-back" onClick={() => navigate(-1)}>← Session</button>
            : <span style={{ width:28 }} />}
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
            <span className="hbar-ttl" style={{ lineHeight:1.1 }}>Gym Now</span>
            <span style={{ fontSize:9, color:'var(--mu)', fontWeight:600, letterSpacing:'0.2px' }}>
              Selected: XJTLU SIP-GM F1
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <button className="theme-toggle-btn" style={{ width:28, height:28, fontSize:13 }} onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <span className="hbar-icon" style={{ cursor:'pointer' }} onClick={() => navigate('/friends')}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
          </div>
        </div>

        <div className="content" style={{ gap:8, overflowY:'hidden', paddingBottom:0 }}>

          {/* ── [1] Floor plan ── */}
          <div style={{ margin:'0 -13px', flexShrink:0 }}>
            <GymFloorPlan zoneCounts={zoneCounts} activeZone={activeZone} onZoneClick={handleZoneClick} />
          </div>

          {/* ── [2] Hint / active filter bar ── */}
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {activeZone ? (
              <>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--brand)', padding:'2px 8px', borderRadius:99, background:'var(--brand-t)', border:'1px solid rgba(65,120,255,0.3)' }}>
                  {ZONE_LABELS[activeZone]}
                </span>
                <button onClick={() => setActiveZone(null)} style={{ fontSize:9, color:'var(--mu)', background:'none', border:'none', cursor:'pointer', padding:0 }}>✕ Clear</button>
              </>
            ) : (
              <span style={{ fontSize:9.5, color:'var(--mu)' }}>Tap a zone on the map to filter · {sortedPersons.length} people</span>
            )}
          </div>

          {/* ── [3-5] Flex area fills remaining height ── */}
          <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', gap:8 }}>

            {/* ── [3] People list ── */}
            <div style={{
              flex:3, minHeight:0, overflow:'hidden',
              background:'var(--s1)', borderRadius:12, border:'1px solid var(--bd)',
              display:'flex', flexDirection:'column',
            }}>
              <div style={{ padding:'5px 12px 4px', fontSize:9, fontWeight:700, color:'var(--mu)', letterSpacing:'0.8px', textTransform:'uppercase', borderBottom:'1px solid var(--bd)', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                {sortedPersons.length} people
                {armedMsg && <span style={{ color:'var(--brand)', fontWeight:700, fontSize:9, letterSpacing:0, textTransform:'none' }}>→ tap to send</span>}
                {pendingCount > 0 && <span style={{ marginLeft:'auto', background:'var(--brand)', color:'#fff', fontSize:8, fontWeight:800, borderRadius:99, padding:'1px 5px' }}>{pendingCount} new</span>}
              </div>
              <div style={{ overflowY:'auto', flex:1 }}>
                {sortedPersons.map(person => {
                  const conv       = conversations[person.id]
                  const convStatus = conv?.status ?? null
                  const isSelected = openConvId === person.id
                  return (
                    <div
                      key={person.id}
                      onClick={() => handlePersonClick(person)}
                      style={{
                        display:'flex', alignItems:'center', gap:9, padding:'7px 12px',
                        borderBottom:'1px solid var(--bd)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(65,120,255,0.06)' : convStatus === 'pending_received' ? 'rgba(245,158,11,0.04)' : 'transparent',
                        opacity: 1,
                        borderLeft: isSelected ? '3px solid var(--brand)' : '3px solid transparent',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <div
                          className={`avatar av-sm${person.isCoach ? ' av-coach' : ''}`}
                          style={person.isAnon ? { background:'var(--s3)', color:'var(--mu)', fontSize:11 } : undefined}
                        >{person.isAnon ? '?' : person.initials}</div>
                        {person.live && !person.isAnon && <div className="online-ring" style={{ borderColor: ringColor(person.hr) }} />}
                        {person.live && person.isAnon  && <div className="online-ring" style={{ borderColor:'var(--bd2)' }} />}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:700, color: person.isCoach ? 'var(--brand)' : 'var(--tx)', display:'flex', alignItems:'center', gap:5, lineHeight:1.2 }}>
                          {person.isAnon ? 'Stranger' : person.name}
                          {person.isCoach && <span style={{ fontSize:8, fontWeight:800, padding:'1px 4px', borderRadius:99, background:'rgba(65,120,255,0.15)', color:'var(--brand)', border:'1px solid rgba(65,120,255,0.28)' }}>COACH</span>}
                          {person.isAnon && <span style={{ fontSize:8, fontWeight:800, padding:'1px 4px', borderRadius:99, background:'rgba(255,255,255,0.08)', color:'var(--mu)', border:'1px solid var(--bd)' }}>STRANGER</span>}
                        </div>
                        <div style={{ fontSize:9.5, color:'var(--mu)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {person.exercise}{!person.isAnon ? ` · ${person.hr} bpm` : ` · ${ZONE_LABELS[person.zone] ?? person.zone}`}
                        </div>
                      </div>

                      {/* Status */}
                      <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
                        {convStatus === 'active' && <span style={{ fontSize:9, color:'var(--z-green)', fontWeight:700 }}>✓</span>}
                        {convStatus === 'pending_sent' && <span style={{ fontSize:8, color:'var(--amber)' }}>…</span>}
                        {convStatus === 'pending_received' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleDecline(person.id) }}
                              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', cursor:'pointer', background:'rgba(239,68,68,0.13)', border:'1px solid rgba(239,68,68,0.4)', color:'var(--z-red)', flexShrink:0 }}
                            ><IcoX /></button>
                            <button
                              onClick={e => { e.stopPropagation(); handleAccept(person.id); setOpenConvId(person.id) }}
                              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:'50%', cursor:'pointer', background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)', color:'var(--z-green)', flexShrink:0 }}
                            ><IcoCheck /></button>
                          </>
                        )}
                        {convStatus && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── [4] Message block — shows conversation for the person selected above ── */}
            <div style={{
              flex:2, minHeight:0, overflow:'hidden',
              background:'var(--s1)', borderRadius:12, border:'1px solid var(--bd)',
              display:'flex', flexDirection:'column',
            }}>
              {openPerson ? (
                openConv ? (
                  <>
                    {/* Header */}
                    <div style={{ padding:'7px 10px', borderBottom:'1px solid var(--bd)', flexShrink:0, display:'flex', alignItems:'center', gap:7 }}>
                      <div className={`avatar av-sm${openConv.isCoach ? ' av-coach' : ''}`} style={{ flexShrink:0 }}>{openConv.buddyInitials}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, lineHeight:1.15 }}>{openConv.buddyName}</div>
                        <div style={{ fontSize:9.5, color:'var(--mu)' }}>{openPerson.exercise} · {openPerson.hr} bpm</div>
                      </div>
                      <span style={{
                        fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:99, letterSpacing:'0.3px',
                        background: openConv.status === 'active' ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)',
                        color:      openConv.status === 'active' ? 'var(--z-green)' : 'var(--amber)',
                        border:     `1px solid ${openConv.status === 'active' ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
                      }}>
                        {openConv.status === 'active' ? 'Connected' : openConv.status === 'pending_sent' ? 'Pending' : 'New'}
                      </span>
                    </div>
                    {/* Messages */}
                    <div style={{ flex:1, overflowY:'auto', padding:'7px 10px', display:'flex', flexDirection:'column', gap:5 }}>
                      {openConv.msgs.map(m => (
                        <div key={m.id} style={{ display:'flex', alignItems:'flex-end', gap:4, flexDirection: m.isSelf ? 'row-reverse' : 'row' }}>
                          <div
                            className={`avatar av-xs${openConv.isCoach && !m.isSelf ? ' av-coach' : ''}`}
                            style={m.isSelf ? { background:'var(--brand)', color:'#fff', flexShrink:0 } : { flexShrink:0 }}
                          >{m.isSelf ? (profile?.username ?? 'ME').slice(0,2).toUpperCase() : openConv.buddyInitials}</div>
                          <div style={{
                            maxWidth:188, padding:'5px 9px',
                            background: m.isSelf ? 'var(--brand)' : 'var(--s2)',
                            border: `1px solid ${m.isSelf ? 'transparent' : 'var(--bd)'}`,
                            borderRadius: m.isSelf ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                            fontSize:11, lineHeight:1.4, color: m.isSelf ? '#fff' : 'var(--tx)',
                          }}>{m.text}</div>
                        </div>
                      ))}
                      <div ref={convEndRef} />
                    </div>
                    {/* Action bar */}
                    {openConv.status === 'pending_received' && (
                      <div style={{ padding:'6px 10px', borderTop:'1px solid var(--bd)', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:7, flexShrink:0 }}>
                        <button onClick={() => handleDecline(openConvId!)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontWeight:700, fontSize:10, background:'rgba(239,68,68,0.13)', border:'1px solid rgba(239,68,68,0.4)', color:'var(--z-red)' }}>
                          <IcoX /> Decline
                        </button>
                        <button onClick={() => handleAccept(openConvId!)} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontWeight:700, fontSize:10, background:'rgba(34,197,94,0.14)', border:'1px solid rgba(34,197,94,0.4)', color:'var(--z-green)' }}>
                          <IcoCheck /> Accept
                        </button>
                      </div>
                    )}
                    {openConv.status === 'pending_sent' && (
                      <div style={{ padding:'6px 10px', borderTop:'1px solid var(--bd)', flexShrink:0 }}>
                        <span style={{ fontSize:10, color:'var(--amber)' }}>⏳ Waiting for {openConv.buddyName} to accept…</span>
                      </div>
                    )}
                    {openConv.status === 'active' && (
                      <div style={{ padding:'5px 8px', borderTop:'1px solid var(--bd)', display:'flex', gap:5, flexShrink:0 }}>
                        <input
                          value={freeInput}
                          onChange={e => setFreeInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendFree()}
                          placeholder="Type a message…"
                          style={{ flex:1, padding:'5px 9px', borderRadius:7, fontSize:11, background:'var(--s2)', border:'1px solid var(--bd)', color:'var(--tx)', outline:'none' }}
                        />
                        <button onClick={handleSendFree} disabled={!freeInput.trim()} style={{ padding:'5px 11px', borderRadius:7, cursor:'pointer', fontWeight:700, fontSize:10, background:'var(--brand)', border:'none', color:'#fff', opacity: freeInput.trim() ? 1 : 0.4 }}>Send</button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Person selected but no conversation yet */
                  <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:16 }}>
                    <div className={`avatar av-md${openPerson.isCoach ? ' av-coach' : ''}`}
                      style={openPerson.isAnon ? { background:'var(--s3)', color:'var(--mu)' } : undefined}>
                      {openPerson.isAnon ? '?' : openPerson.initials}
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:13, fontWeight:700, color: openPerson.isCoach ? 'var(--brand)' : 'var(--tx)' }}>
                        {openPerson.isAnon ? 'Stranger' : openPerson.name}
                      </div>
                      <div style={{ fontSize:10, color:'var(--mu)', marginTop:2 }}>{openPerson.exercise} · {openPerson.isAnon ? ZONE_LABELS[openPerson.zone] : `${openPerson.hr} bpm`}</div>
                      {openPerson.isAnon && <div style={{ fontSize:9, color:'var(--mu)', marginTop:3, opacity:0.7 }}>Send a greeting to connect</div>}
                    </div>
                    {armedMsg ? (
                      <button
                        onClick={handleSendArmed}
                        style={{ padding:'7px 16px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:11, background:'var(--brand)', border:'none', color:'#fff', display:'flex', alignItems:'center', gap:6 }}
                      >
                        Send "{armedMsg.en}" →
                      </button>
                    ) : (
                      <span style={{ fontSize:10, color:'var(--mu)', opacity:0.6, textAlign:'center', lineHeight:1.5 }}>
                        Pick a greeting below{'\n'}to say hi
                      </span>
                    )}
                  </div>
                )
              ) : (
                /* Nothing selected */
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5, opacity:0.35 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ fontSize:10, color:'var(--mu)' }}>Select a person above</span>
                </div>
              )}
            </div>

            {/* ── [5] Quick greet — fixed compact ── */}
            <div style={{
              flexShrink:0, background:'var(--s1)', borderRadius:12, border:'1px solid var(--bd)',
              padding:'6px 10px',
            }}>
              {/* Tabs row */}
              <div style={{ display:'flex', gap:5, marginBottom:5 }}>
                {(['HELP', 'HOW', 'HI'] as MsgTab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setMsgTab(t); setArmedMsg(null) }}
                    style={{
                      flex:1, padding:'3px 0', fontSize:9, fontWeight:700, borderRadius:5, cursor:'pointer',
                      letterSpacing:'0.3px', textTransform:'uppercase',
                      background: msgTab === t ? 'var(--brand-t)' : 'transparent',
                      border:     `1px solid ${msgTab === t ? 'var(--brand)' : 'var(--bd)'}`,
                      color:      msgTab === t ? 'var(--brand)' : 'var(--mu)',
                    }}
                  >{GYM_TAB_LABEL[t]}</button>
                ))}
              </div>
              {/* Pills */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {msgList.map((m, i) => {
                  const active = armedMsg?.en === m.en
                  return (
                    <button
                      key={i}
                      onClick={() => setArmedMsg(active ? null : m)}
                      style={{
                        padding: isHiTab ? '5px 9px' : '4px 9px',
                        fontSize: isHiTab ? 16 : 10,
                        borderRadius:14, cursor:'pointer',
                        background: active ? 'var(--brand)' : 'var(--s2)',
                        border: `1px solid ${active ? 'var(--brand)' : 'var(--bd)'}`,
                        color: active ? '#fff' : 'var(--tx)',
                        display:'flex', flexDirection: isHiTab ? undefined : 'column',
                        alignItems:'center', gap:1,
                      }}
                    >
                      {isHiTab ? (
                        <span>{m.en} <span style={{ fontSize:9 }}>{m.zh}</span></span>
                      ) : (
                        <>
                          <span style={{ fontSize:10 }}>{m.en}</span>
                          <span style={{ fontSize:8, opacity: active ? 0.8 : 0.5 }}>{m.zh}</span>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>{/* end flex area */}
        </div>

        {!fromSession && <BottomNav />}
      </div>
    </>
  )
}
