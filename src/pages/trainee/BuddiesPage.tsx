import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { usePresenceStore } from '../../store/presenceStore'
import { BottomNav } from '../../components/BottomNav'
import { GymFloorPlan } from '../../components/GymFloorPlan'
import type { ZoneCount } from '../../components/GymFloorPlan'

const ZONE_CAPACITY = { cardio: 12, free_weight: 8, machine: 10, stretching: 6 }
const ZONE_LABELS: Record<string, string> = {
  cardio: 'Cardio', free_weight: 'Free Weights', machine: 'Machines', stretching: 'Stretching',
}

type Category = 'all' | 'coach' | 'cardio' | 'free_weight' | 'machine' | 'stretching'
const CAT_LABELS: [Category, string][] = [
  ['all', 'All'], ['coach', 'Coach'], ['cardio', 'Cardio'],
  ['free_weight', 'Free Weights'], ['machine', 'Machines'], ['stretching', 'Stretching'],
]

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

const COACH_ENTRY: DisplayBuddy = {
  id: 'cw', name: 'Coach Wang', initials: 'CW',
  hr: 75, exercise: 'Coaching', zone: 'free_weight', live: true, isAnon: false, isCoach: true,
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

// ── Conversation model ────────────────────────────────────────────────────────
type ConvStatus = 'pending_received' | 'pending_sent' | 'active'
interface ConvMsg  { id: number; text: string; isSelf: boolean }
interface Conversation {
  buddyId: string; buddyName: string; buddyInitials: string
  isCoach: boolean; status: ConvStatus; msgs: ConvMsg[]
}

const DEMO_INCOMING = [
  { convId:'xm', name:'Xiao Ming',  initials:'XM', textEn:'Still 3 sets to go?',    textZh:'还剩3组吗？',     isCoach:false, delay:2500  },
  { convId:'cw', name:'Coach Wang', initials:'CW', textEn:'Keep your form tight!',   textZh:'保持动作标准！',   isCoach:true,  delay:5500  },
  { convId:'xh', name:'Xiao Hong',  initials:'XH', textEn:'🔥 Let\'s go!!',           textZh:'🔥 加油！！',      isCoach:false, delay:9000  },
  { convId:'cw', name:'Coach Wang', initials:'CW', textEn:'Rest 90s between sets.',   textZh:'组间休息90秒。',   isCoach:true,  delay:13000 },
  { convId:'xg', name:'Xiao Gang',  initials:'XG', textEn:'Can I work in with you?',  textZh:'我能一起练吗？',   isCoach:false, delay:17000 },
  { convId:'cw', name:'Coach Wang', initials:'CW', textEn:'Great energy today 💯',    textZh:'今天状态很好 💯',  isCoach:true,  delay:22000 },
]

function IcoCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export default function BuddiesPage() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const fromSession = (location.state as { fromSession?: boolean } | null)?.fromSession

  const { profile }                        = useAuthStore()
  const { presences, fetchAll, subscribe } = usePresenceStore()

  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [conversations,  setConversations]  = useState<Record<string, Conversation>>({})
  const [openConvId,     setOpenConvId]     = useState<string | null>(null)
  const [freeInput,      setFreeInput]      = useState('')

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
          const newMsg: ConvMsg = { id: convMsgIdRef.current++, text: `${m.textEn} · ${m.textZh}`, isSelf: false }
          const existing = prev[m.convId]
          if (existing) return { ...prev, [m.convId]: { ...existing, msgs: [...existing.msgs, newMsg] } }
          return {
            ...prev,
            [m.convId]: {
              buddyId: m.convId, buddyName: m.name, buddyInitials: m.initials,
              isCoach: m.isCoach, status: 'pending_received', msgs: [newMsg],
            },
          }
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

  // ── Build persons list ───────────────────────────────────────────────────
  const allPersons: DisplayBuddy[] = hasReal
    ? [COACH_ENTRY, ...realBuddies.map(p => ({
        id: p.trainee_id, isAnon: false, isCoach: false,
        name:     (p.profiles?.username ?? p.trainee_id).slice(0, 12),
        initials: (p.profiles?.username ?? p.trainee_id).slice(0, 2).toUpperCase(),
        hr: p.current_hr, exercise: p.exercise_name ?? 'Active',
        zone: exerciseToZone(p.exercise_name), live: true,
      }))]
    : [COACH_ENTRY, ...STATIC_BUDDIES]

  const filteredPersons = allPersons.filter(p => {
    if (activeCategory === 'all')   return true
    if (activeCategory === 'coach') return p.isCoach
    return !p.isCoach && p.zone === activeCategory
  })

  const sortPriority = (p: DisplayBuddy) => {
    if (p.isCoach) return 0
    const s = conversations[p.id]?.status
    if (s === 'active')           return 1
    if (s === 'pending_received') return 2
    if (!p.isAnon && !s)          return 3
    if (s === 'pending_sent')     return 4
    return 5  // anonymous, no connection
  }
  const sortedPersons = [...filteredPersons].sort((a, b) => sortPriority(a) - sortPriority(b))

  const floorZone    = (activeCategory !== 'all' && activeCategory !== 'coach') ? activeCategory : null
  const pendingCount = Object.values(conversations).filter(c => c.status === 'pending_received').length
  const openConv     = openConvId ? conversations[openConvId] : null

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleZoneClick(zone: string) {
    setActiveCategory(c => c === zone ? 'all' : zone as Category)
  }

  function handleSayHi(buddy: DisplayBuddy) {
    const convId = buddy.id
    setConversations(prev => ({
      ...prev,
      [convId]: {
        buddyId: convId, buddyName: buddy.name, buddyInitials: buddy.initials,
        isCoach: buddy.isCoach, status: 'pending_sent',
        msgs: [{ id: convMsgIdRef.current++, text: 'Hey! 👋 · 嗨！', isSelf: true }],
      },
    }))
    setOpenConvId(convId)
    setTimeout(() => {
      setConversations(prev => {
        const c = prev[convId]
        if (!c || c.status !== 'pending_sent') return prev
        return {
          ...prev,
          [convId]: {
            ...c, status: 'active',
            msgs: [...c.msgs, { id: convMsgIdRef.current++, text: 'Sure! Happy to connect 👋 · 很高兴认识！', isSelf: false }],
          },
        }
      })
    }, 7000)
  }

  function handleAccept(convId: string) {
    setConversations(prev => {
      const c = prev[convId]
      if (!c) return prev
      return {
        ...prev,
        [convId]: {
          ...c, status: 'active',
          msgs: [...c.msgs, { id: convMsgIdRef.current++, text: 'Sure, happy to connect! 😊 · 好的，很高兴！', isSelf: true }],
        },
      }
    })
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

      <div className="app-shell" style={{ position:'relative', zIndex:1, height:'100vh', overflow:'hidden' }}>
        <div className="hbar">
          {fromSession
            ? <button className="hbar-back" onClick={() => navigate(-1)}>← Session</button>
            : <span style={{ width:28 }} />}
          <span className="hbar-ttl">Gym Now</span>
          <span className="hbar-icon" style={{ cursor:'pointer' }} onClick={() => navigate('/friends')}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
        </div>

        <div className="content" style={{ gap:8, overflowY:'hidden' }}>

          {/* Floor plan */}
          <div style={{ height:180, margin:'0 -13px', flexShrink:0 }}>
            <GymFloorPlan zoneCounts={zoneCounts} activeZone={floorZone} onZoneClick={handleZoneClick} />
          </div>

          {/* Category chips */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, flexShrink:0 }}>
            {CAT_LABELS.map(([cat, label]) => (
              <button
                key={cat}
                className={`chip${activeCategory === cat ? ' on' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={{ flexShrink:0 }}
              >{label}</button>
            ))}
          </div>

          {/* ── People panel ── */}
          <div style={{
            flex:1, minHeight:0, overflow:'hidden',
            background:'var(--s1)', borderRadius:12, border:'1px solid var(--bd)',
            display:'flex', flexDirection:'column',
          }}>

            {/* ── Conversation view ── */}
            {openConv ? (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderBottom:'1px solid var(--bd)', flexShrink:0 }}>
                  <button
                    onClick={() => setOpenConvId(null)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--brand)', fontSize:12, padding:0, fontWeight:700 }}
                  >← Back</button>
                  <div className={`avatar av-sm${openConv.isCoach ? ' av-coach' : ''}`} style={{ flexShrink:0 }}>{openConv.buddyInitials}</div>
                  <span style={{ fontSize:12, fontWeight:700, flex:1 }}>{openConv.buddyName}</span>
                  <span style={{
                    fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, letterSpacing:'0.3px',
                    background: openConv.status === 'active' ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)',
                    color:      openConv.status === 'active' ? 'var(--z-green)' : 'var(--amber)',
                    border:     `1px solid ${openConv.status === 'active' ? 'rgba(34,197,94,0.35)' : 'rgba(245,158,11,0.35)'}`,
                  }}>
                    {openConv.status === 'active' ? 'Connected' : openConv.status === 'pending_sent' ? 'Pending' : 'New'}
                  </span>
                </div>

                <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'flex', flexDirection:'column', gap:7 }}>
                  {openConv.msgs.map(m => (
                    <div key={m.id} style={{ display:'flex', alignItems:'flex-end', gap:5, flexDirection: m.isSelf ? 'row' : 'row-reverse' }}>
                      <div
                        className={`avatar av-sm${openConv.isCoach && !m.isSelf ? ' av-coach' : ''}`}
                        style={m.isSelf ? { background:'var(--brand)', color:'#fff', flexShrink:0 } : { flexShrink:0 }}
                      >{m.isSelf ? (profile?.username ?? 'ME').slice(0,2).toUpperCase() : openConv.buddyInitials}</div>
                      <div style={{
                        maxWidth:186, padding:'6px 10px',
                        background: m.isSelf ? 'var(--brand)' : openConv.isCoach ? 'rgba(65,120,255,0.13)' : 'var(--s2)',
                        border: `1px solid ${m.isSelf ? 'transparent' : openConv.isCoach ? 'rgba(65,120,255,0.3)' : 'var(--bd)'}`,
                        borderRadius: m.isSelf ? '12px 12px 12px 3px' : '12px 12px 3px 12px',
                        fontSize:12, lineHeight:1.45, color: m.isSelf ? '#fff' : 'var(--tx)',
                      }}>{m.text}</div>
                    </div>
                  ))}
                  <div ref={convEndRef} />
                </div>

                {openConv.status === 'pending_received' && (
                  <div style={{ padding:'8px 10px', borderTop:'1px solid var(--bd)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:11, color:'var(--mu)', flex:1 }}>Accept to reply freely</span>
                    <button
                      onClick={() => handleAccept(openConvId!)}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:11, background:'rgba(34,197,94,0.14)', border:'1px solid rgba(34,197,94,0.4)', color:'var(--z-green)' }}
                    ><IcoCheck /> Accept</button>
                  </div>
                )}
                {openConv.status === 'pending_sent' && (
                  <div style={{ padding:'8px 10px', borderTop:'1px solid var(--bd)', flexShrink:0 }}>
                    <span style={{ fontSize:11, color:'var(--amber)' }}>⏳ Waiting for {openConv.buddyName} to accept…</span>
                  </div>
                )}
                {openConv.status === 'active' && (
                  <div style={{ padding:'6px 8px', borderTop:'1px solid var(--bd)', display:'flex', gap:6, flexShrink:0 }}>
                    <input
                      value={freeInput}
                      onChange={e => setFreeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendFree()}
                      placeholder="Type a message…"
                      style={{ flex:1, padding:'6px 10px', borderRadius:8, fontSize:12, background:'var(--s2)', border:'1px solid var(--bd)', color:'var(--tx)', outline:'none' }}
                    />
                    <button
                      onClick={handleSendFree}
                      disabled={!freeInput.trim()}
                      style={{ padding:'6px 12px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:11, background:'var(--brand)', border:'none', color:'#fff', opacity: freeInput.trim() ? 1 : 0.4 }}
                    >Send</button>
                  </div>
                )}
              </>
            ) : (
              /* ── People list ── */
              <>
                {/* List header */}
                <div style={{ padding:'7px 12px 5px', fontSize:9, fontWeight:700, color:'var(--mu)', letterSpacing:'0.8px', textTransform:'uppercase', borderBottom:'1px solid var(--bd)', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                  {sortedPersons.length} people
                  {pendingCount > 0 && (
                    <span style={{ background:'var(--brand)', color:'#fff', fontSize:8, fontWeight:800, borderRadius:99, padding:'1px 6px' }}>{pendingCount} new</span>
                  )}
                </div>

                {/* Rows */}
                <div style={{ overflowY:'auto', flex:1 }}>
                  {sortedPersons.length === 0 ? (
                    <div style={{ fontSize:11, color:'var(--mu)', textAlign:'center', padding:'18px 0' }}>Nobody here right now</div>
                  ) : sortedPersons.map(person => {
                    const conv       = conversations[person.id]
                    const convStatus = conv?.status ?? null
                    const canTap     = !!conv

                    return (
                      <div
                        key={person.id}
                        onClick={() => canTap && setOpenConvId(person.id)}
                        style={{
                          display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                          borderBottom:'1px solid var(--bd)',
                          cursor: canTap ? 'pointer' : 'default',
                          background: convStatus === 'pending_received' ? 'rgba(245,158,11,0.04)' : 'transparent',
                          opacity: person.isAnon ? 0.6 : 1,
                        }}
                      >
                        {/* Avatar with HR ring */}
                        <div style={{ position:'relative', flexShrink:0 }}>
                          <div
                            className={`avatar av-md${person.isCoach ? ' av-coach' : ''}`}
                            style={person.isAnon ? { background:'var(--s3)', color:'var(--mu)', fontSize:13 } : undefined}
                          >{person.isAnon ? '?' : person.initials}</div>
                          {person.live && !person.isAnon && <div className="online-ring" style={{ borderColor: ringColor(person.hr) }} />}
                          {person.live && person.isAnon  && <div className="online-ring" style={{ borderColor:'var(--bd2)' }} />}
                        </div>

                        {/* Name + info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color: person.isCoach ? 'var(--brand)' : 'var(--tx)', display:'flex', alignItems:'center', gap:5 }}>
                            {person.name}
                            {person.isCoach && (
                              <span style={{ fontSize:8, fontWeight:800, padding:'1px 5px', borderRadius:99, background:'rgba(65,120,255,0.15)', color:'var(--brand)', border:'1px solid rgba(65,120,255,0.28)', letterSpacing:'0.3px' }}>COACH</span>
                            )}
                          </div>
                          <div style={{ fontSize:10, color:'var(--mu)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:1 }}>
                            {person.exercise}
                            {!person.isAnon
                              ? ` · ${person.hr} bpm`
                              : ` · ${ZONE_LABELS[person.zone] ?? person.zone}`}
                          </div>
                          {convStatus === 'pending_received' && <div style={{ fontSize:9, color:'var(--amber)', marginTop:2 }}>Sent you a greeting</div>}
                          {convStatus === 'pending_sent'     && <div style={{ fontSize:9, color:'var(--amber)', marginTop:2 }}>⏳ Waiting for reply…</div>}
                          {convStatus === 'active'           && <div style={{ fontSize:9, color:'var(--z-green)', marginTop:2 }}>✓ Connected</div>}
                        </div>

                        {/* Right actions */}
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          {!person.isAnon && !convStatus && (
                            <button
                              onClick={e => { e.stopPropagation(); handleSayHi(person) }}
                              style={{ padding:'4px 9px', borderRadius:8, cursor:'pointer', fontSize:10, fontWeight:700, background:'var(--brand-t)', border:'1px solid rgba(65,120,255,0.35)', color:'var(--brand)' }}
                            >Hi 👋</button>
                          )}
                          {convStatus === 'pending_received' && (
                            <button
                              onClick={e => { e.stopPropagation(); handleAccept(person.id); setOpenConvId(person.id) }}
                              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', cursor:'pointer', background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.4)', color:'var(--z-green)' }}
                            ><IcoCheck /></button>
                          )}
                          {(convStatus === 'active' || convStatus === 'pending_sent') && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--mu)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

        </div>

        {!fromSession && <BottomNav />}
      </div>
    </>
  )
}
