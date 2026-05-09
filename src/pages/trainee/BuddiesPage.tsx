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

const TAB_LABELS: Record<MsgTab, string> = { HELP: '🆘 Help', HOW: '🤔 How', HI: '👋 Hey' }

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

// Pre-existing active conversations (already chatted before opening the page)
let _msgId = 0
const PRESET_CONVS: Record<string, Conversation> = {
  xm: {
    buddyId:'xm', buddyName:'Xiao Ming', buddyInitials:'XM', isCoach:false, status:'active',
    msgs: [
      { id:_msgId++, text:'Hey, want to grab the squat rack after me?', isSelf:false },
      { id:_msgId++, text:'Sure! How many sets do you have left?',       isSelf:true  },
      { id:_msgId++, text:'Just 2 more, maybe 10 mins 💪',               isSelf:false },
      { id:_msgId++, text:"Perfect, I'll warm up till then",             isSelf:true  },
    ],
  },
  xl: {
    buddyId:'xl', buddyName:'Xiao Li', buddyInitials:'XL', isCoach:false, status:'active',
    msgs: [
      { id:_msgId++, text:'Nice pace on the treadmill!',    isSelf:true  },
      { id:_msgId++, text:'Thanks! Trying to hit 10K today 🏃', isSelf:false },
      { id:_msgId++, text:"Let's go! Almost there",         isSelf:true  },
      { id:_msgId++, text:'5K left, not stopping 😤',       isSelf:false },
    ],
  },
}

// Incoming requests that arrive after a short delay
const DEMO_INCOMING = [
  { convId:'xh', name:'Xiao Hong', initials:'XH', text:"🔥 Let's go!!",           isCoach:false, delay:2500 },
  { convId:'xg', name:'Xiao Gang', initials:'XG', text:'Can I work in with you?', isCoach:false, delay:6000 },
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
  const { theme, toggle }                  = useTheme()

  const [activeZone,        setActiveZone]        = useState<string | null>(null)
  const [conversations,     setConversations]     = useState<Record<string, Conversation>>(PRESET_CONVS)
  const [openConvId,        setOpenConvId]        = useState<string | null>(null)
  const [freeInput,         setFreeInput]         = useState('')
  const [msgTab,            setMsgTab]            = useState<MsgTab>('HELP')
  const [armedMsg,          setArmedMsg]          = useState<BiMsg | null>(null)
  const [revealedStrangers, setRevealedStrangers] = useState<Record<string, { name: string; initials: string }>>({})
  const [acceptedToast,     setAcceptedToast]     = useState<{ name: string; initials: string } | null>(null)

  const convMsgIdRef = useRef(_msgId)  // start after preset message IDs
  const convEndRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAll(); const unsub = subscribe(); return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timers = DEMO_INCOMING.map(m =>
      setTimeout(() => {
        setConversations(prev => {
          const msg: ConvMsg = { id: convMsgIdRef.current++, text: m.text, isSelf: false }
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

  const filteredPersons = allPersons.filter(p => !activeZone || p.zone === activeZone)

  const sortPriority = (p: DisplayBuddy) => {
    const s = conversations[p.id]?.status
    if (s === 'active')           return 1
    if (s === 'pending_received') return 2
    if (!p.isAnon && !s)          return 3
    if (s === 'pending_sent')     return 4
    return 5
  }
  const sortedPersons = [...filteredPersons].sort((a, b) => sortPriority(a) - sortPriority(b))

  const pendingCount = Object.values(conversations).filter(c => c.status === 'pending_received').length
  const openConv     = openConvId ? conversations[openConvId] : null
  const openPerson   = openConvId ? allPersons.find(p => p.id === openConvId) ?? null : null
  const msgList      = getMsgList(msgTab)

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleSendArmed() {
    if (!openConvId || !armedMsg) return
    const person = allPersons.find(p => p.id === openConvId)
    if (!person) return
    const isStranger = person.isAnon
    const text = armedMsg.en

    setConversations(prev => {
      const existing = prev[openConvId]
      if (existing && existing.status === 'active')
        return { ...prev, [openConvId]: { ...existing, msgs: [...existing.msgs, { id: convMsgIdRef.current++, text, isSelf: true }] } }
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
              text: isStranger ? "Hi! 👋 Let's connect!" : 'Sure! Happy to connect 👋',
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
    setConversations(prev => { const next = { ...prev }; delete next[convId]; return next })
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

  // ── Render: conversation panel (used when openConvId is set) ─────────────
  function renderConv() {
    if (!openPerson) return null
    return (
      <>
        {/* Conv header with back button */}
        <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--bd)', flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
          <button
            onClick={() => setOpenConvId(null)}
            style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:700, color:'var(--brand)', background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div className={`avatar av-sm${openConv?.isCoach ? ' av-coach' : ''}`}
            style={openPerson.isAnon ? { background:'var(--s3)', color:'var(--mu)', flexShrink:0 } : { flexShrink:0 }}>
            {openPerson.isAnon ? '?' : openPerson.initials}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, lineHeight:1.2 }}>{openConv?.buddyName ?? (openPerson.isAnon ? 'Stranger' : openPerson.name)}</div>
            <div style={{ fontSize:9.5, color:'var(--mu)' }}>{openPerson.exercise}{!openPerson.isAnon ? ` · ${openPerson.hr} bpm` : ''}</div>
          </div>
          {openConv && (
            <span style={{
              fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:99, letterSpacing:'0.3px', flexShrink:0,
              background: openConv.status === 'active' ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)',
              color:      openConv.status === 'active' ? 'var(--z-green)' : 'var(--amber)',
              border:     `1px solid ${openConv.status === 'active' ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
            }}>
              {openConv.status === 'active' ? 'Connected' : openConv.status === 'pending_sent' ? 'Pending' : 'New'}
            </span>
          )}
        </div>

        {openConv ? (
          <>
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
            {/* Action bars */}
            {openConv.status === 'pending_received' && (
              <div style={{ padding:'6px 10px', borderTop:'1px solid var(--bd)', display:'flex', justifyContent:'flex-end', gap:7, flexShrink:0 }}>
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
          /* Person selected, no conversation started yet */
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:16 }}>
            <div className={`avatar av-md${openPerson.isCoach ? ' av-coach' : ''}`}
              style={openPerson.isAnon ? { background:'var(--s3)', color:'var(--mu)' } : undefined}>
              {openPerson.isAnon ? '?' : openPerson.initials}
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:13, fontWeight:700, color: openPerson.isCoach ? 'var(--brand)' : 'var(--tx)' }}>
                {openPerson.isAnon ? 'Stranger' : openPerson.name}
              </div>
              <div style={{ fontSize:10, color:'var(--mu)', marginTop:2 }}>
                {openPerson.exercise}{openPerson.isAnon ? ` · ${ZONE_LABELS[openPerson.zone] ?? openPerson.zone}` : ` · ${openPerson.hr} bpm`}
              </div>
              {openPerson.isAnon && <div style={{ fontSize:9, color:'var(--mu)', marginTop:3, opacity:0.7 }}>Send a greeting to connect</div>}
            </div>
            {armedMsg ? (
              <button
                onClick={handleSendArmed}
                style={{ padding:'7px 16px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:11, background:'var(--brand)', border:'none', color:'#fff' }}
              >
                Send "{armedMsg.en}" →
              </button>
            ) : (
              <span style={{ fontSize:10, color:'var(--mu)', opacity:0.6, textAlign:'center' }}>Pick a greeting below to say hi</span>
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />

      <style>{`
        @keyframes buddy-toast-in  { from{opacity:0;transform:translateY(-18px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes buddy-flash     { 0%,100%{box-shadow:0 4px 24px rgba(34,197,94,0.45)} 50%{box-shadow:0 4px 36px rgba(34,197,94,0.85)} }
        .buddy-toast { animation: buddy-toast-in 0.32s cubic-bezier(.2,.8,.4,1) forwards, buddy-flash 0.7s ease-in-out infinite; }
        .greet-scroll::-webkit-scrollbar { display: none; }
        .greet-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Accepted toast */}
      {acceptedToast && (
        <div style={{ position:'fixed', top:56, left:0, right:0, zIndex:300, display:'flex', justifyContent:'center', pointerEvents:'none' }}>
          <div className="buddy-toast" style={{
            background:'linear-gradient(135deg,rgba(22,163,74,0.97),rgba(16,130,60,0.97))',
            borderRadius:14, padding:'10px 16px', display:'flex', alignItems:'center', gap:10,
            border:'1px solid rgba(34,197,94,0.5)',
          }}>
            <div className="avatar av-sm" style={{ background:'rgba(255,255,255,0.22)', color:'#fff', fontWeight:800, flexShrink:0 }}>
              {acceptedToast.initials}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.2 }}>{acceptedToast.name} accepted! 👋</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)', marginTop:2 }}>Connected — you can now chat freely</div>
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
            <span style={{ fontSize:9, color:'var(--mu)', fontWeight:600, letterSpacing:'0.2px' }}>XJTLU SIP-GM F1</span>
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
            <GymFloorPlan zoneCounts={zoneCounts} activeZone={activeZone} onZoneClick={z => setActiveZone(z === activeZone ? null : z)} />
          </div>

          {/* ── [2] Zone filter hint ── */}
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            {activeZone ? (
              <>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--brand)', padding:'2px 8px', borderRadius:99, background:'var(--brand-t)', border:'1px solid rgba(65,120,255,0.3)' }}>
                  {ZONE_LABELS[activeZone]}
                </span>
                <button onClick={() => setActiveZone(null)} style={{ fontSize:9, color:'var(--mu)', background:'none', border:'none', cursor:'pointer', padding:0 }}>✕ Clear</button>
              </>
            ) : (
              <span style={{ fontSize:9.5, color:'var(--mu)' }}>Tap a zone to filter · {sortedPersons.length} people</span>
            )}
          </div>

          {/* ── [3-4] Flex area ── */}
          <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', gap:8 }}>

            {/* ── [3] Combined buddy list / conversation panel ── */}
            <div style={{
              flex:1, minHeight:0, overflow:'hidden',
              background:'var(--s1)', borderRadius:12, border:'1px solid var(--bd)',
              display:'flex', flexDirection:'column',
            }}>
              {openConvId ? renderConv() : (
                /* ── Buddy list view ── */
                <>
                  <div style={{ padding:'6px 12px 5px', fontSize:9, fontWeight:700, color:'var(--mu)', letterSpacing:'0.8px', textTransform:'uppercase', borderBottom:'1px solid var(--bd)', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                    {sortedPersons.length} people in gym
                    {armedMsg && <span style={{ color:'var(--brand)', fontWeight:700, fontSize:9, letterSpacing:0, textTransform:'none' }}>→ tap to send</span>}
                    {pendingCount > 0 && <span style={{ marginLeft:'auto', background:'var(--brand)', color:'#fff', fontSize:8, fontWeight:800, borderRadius:99, padding:'1px 5px' }}>{pendingCount} new</span>}
                  </div>
                  <div style={{ overflowY:'auto', flex:1 }}>
                    {sortedPersons.map(person => {
                      const conv       = conversations[person.id]
                      const convStatus = conv?.status ?? null
                      return (
                        <div
                          key={person.id}
                          onClick={() => setOpenConvId(person.id)}
                          style={{
                            display:'flex', alignItems:'center', gap:10,
                            padding:'10px 12px',
                            borderBottom:'1px solid var(--bd)', cursor:'pointer',
                            background: convStatus === 'pending_received' ? 'rgba(245,158,11,0.04)' : 'transparent',
                            borderLeft: convStatus === 'active' ? '3px solid var(--z-green)' : convStatus === 'pending_received' ? '3px solid var(--amber)' : '3px solid transparent',
                          }}
                        >
                          {/* Avatar */}
                          <div style={{ position:'relative', flexShrink:0 }}>
                            <div
                              className={`avatar av-md${person.isCoach ? ' av-coach' : ''}`}
                              style={person.isAnon ? { background:'var(--s3)', color:'var(--mu)' } : undefined}
                            >{person.isAnon ? '?' : person.initials}</div>
                            {person.live && !person.isAnon && <div className="online-ring" style={{ borderColor: ringColor(person.hr) }} />}
                            {person.live && person.isAnon  && <div className="online-ring" style={{ borderColor:'var(--bd2)' }} />}
                          </div>

                          {/* Info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:700, color: person.isCoach ? 'var(--brand)' : 'var(--tx)', display:'flex', alignItems:'center', gap:5, lineHeight:1.25 }}>
                              {person.isAnon ? 'Stranger' : person.name}
                              {person.isCoach && <span style={{ fontSize:8, fontWeight:800, padding:'1px 4px', borderRadius:99, background:'rgba(65,120,255,0.15)', color:'var(--brand)', border:'1px solid rgba(65,120,255,0.28)' }}>COACH</span>}
                              {person.isAnon && <span style={{ fontSize:8, fontWeight:800, padding:'1px 4px', borderRadius:99, background:'rgba(255,255,255,0.08)', color:'var(--mu)', border:'1px solid var(--bd)' }}>STRANGER</span>}
                            </div>
                            <div style={{ fontSize:10, color:'var(--mu)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>
                              {person.exercise}{!person.isAnon ? ` · ${person.hr} bpm` : ` · ${ZONE_LABELS[person.zone] ?? person.zone}`}
                            </div>
                          </div>

                          {/* Status / actions */}
                          <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:5 }}>
                            {convStatus === 'active' && <span style={{ fontSize:9, color:'var(--z-green)', fontWeight:700 }}>✓</span>}
                            {convStatus === 'pending_sent' && <span style={{ fontSize:9, color:'var(--amber)' }}>…</span>}
                            {convStatus === 'pending_received' && (
                              <>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDecline(person.id) }}
                                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:'50%', cursor:'pointer', background:'rgba(239,68,68,0.13)', border:'1px solid rgba(239,68,68,0.4)', color:'var(--z-red)', flexShrink:0 }}
                                ><IcoX /></button>
                                <button
                                  onClick={e => { e.stopPropagation(); handleAccept(person.id); setOpenConvId(person.id) }}
                                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:24, height:24, borderRadius:'50%', cursor:'pointer', background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)', color:'var(--z-green)', flexShrink:0 }}
                                ><IcoCheck /></button>
                              </>
                            )}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.5 }}>
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ── [4] Quick greet ── */}
            <div style={{
              flexShrink:0, background:'var(--s1)', borderRadius:12, border:'1px solid var(--bd)',
              padding:'7px 10px 8px',
            }}>
              {/* Tab row */}
              <div style={{ display:'flex', gap:5, marginBottom:6 }}>
                {(['HELP', 'HOW', 'HI'] as MsgTab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => { setMsgTab(t); setArmedMsg(null) }}
                    style={{
                      flex:1, padding:'4px 0', fontSize:10, fontWeight:700, borderRadius:6, cursor:'pointer',
                      background: msgTab === t ? 'var(--brand-t)' : 'transparent',
                      border:     `1px solid ${msgTab === t ? 'var(--brand)' : 'var(--bd)'}`,
                      color:      msgTab === t ? 'var(--brand)' : 'var(--mu)',
                      minHeight:0, minWidth:0,
                    }}
                  >{TAB_LABELS[t]}</button>
                ))}
              </div>
              {/* Horizontally scrollable message pills — English only */}
              <div className="greet-scroll" style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
                {msgList.map((m, i) => {
                  const active = armedMsg?.en === m.en
                  return (
                    <button
                      key={i}
                      onClick={() => setArmedMsg(active ? null : m)}
                      style={{
                        flexShrink:0,
                        padding: msgTab === 'HI' ? '5px 10px' : '5px 12px',
                        fontSize: msgTab === 'HI' ? 18 : 11,
                        borderRadius:20, cursor:'pointer',
                        background: active ? 'var(--brand)' : 'var(--s2)',
                        border: `1px solid ${active ? 'var(--brand)' : 'var(--bd)'}`,
                        color: active ? '#fff' : 'var(--tx)',
                        fontWeight: active ? 700 : 500,
                        minHeight:0, minWidth:0,
                        whiteSpace:'nowrap',
                      }}
                    >
                      {m.en}
                    </button>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

        {!fromSession && <BottomNav />}
      </div>
    </>
  )
}
