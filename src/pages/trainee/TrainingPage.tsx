import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { usePresenceStore } from '../../store/presenceStore'
import type { Exercise } from '../../data/exercises'
import { exercises } from '../../data/exercises'
import { type BiMsg, type MsgTab, GYM_TAB_ICON, getMsgList } from '../../lib/gymMessages'

const TOTAL_SETS = 5

export type SetRecord = { exercise: string; setNum: number; hr: number }

interface TrainChatMsg { id: number; name: string; initials: string; textEn: string; textZh: string; isCoach: boolean; isSelf?: boolean }

const TRAIN_DEMO: { delay: number; name: string; initials: string; textEn: string; textZh: string; isCoach: boolean }[] = [
  { delay:2000,  name:'Coach Wang', initials:'CW', textEn:'Looking strong! Keep the tempo.',    textZh:'状态不错！保持节奏。',   isCoach:true  },
  { delay:5500,  name:'Xiao Ming',  initials:'XM', textEn:'How many sets left?',                textZh:'还有几组？',           isCoach:false },
  { delay:9000,  name:'Coach Wang', initials:'CW', textEn:'Control the negative on each rep.',  textZh:'控制离心阶段。',        isCoach:true  },
  { delay:14000, name:'Xiao Hong',  initials:'XH', textEn:'Great form! 💪',                     textZh:'动作很标准！💪',        isCoach:false },
  { delay:19000, name:'Coach Wang', initials:'CW', textEn:'Rest 90s then finish strong.',       textZh:'休息90秒再冲最后几组。', isCoach:true  },
]

function hrZone(bpm: number) {
  if (bpm < 120) return { color:'var(--z-blue)',  label:'Warm Up Zone',   bg:'bth-blue',  hint:'BLUE · slow pulse · build up' }
  if (bpm < 150) return { color:'var(--z-green)', label:'In Target Zone', bg:'bth-green', hint:'GREEN · 3s pulse · maintain target zone' }
  return              { color:'var(--z-red)',   label:'High Intensity!', bg:'bth-red',   hint:'RED · fast pulse · ease off!' }
}

// Normalise exercise data — works for both old Exercise and new ExEntry from JSON
function resolveEx(raw: any): {
  name: string; id: string; sets: string; reps: string; icon: string
  muscle: string; equipment: string; level: string; mechanics: string; instructions: string
} {
  const muscleLabel: Record<string, string> = {
    chest:'Chest', back:'Back', shoulders:'Shoulders',
    legs_glutes:'Legs & Glutes', legs:'Legs', arms:'Arms', core:'Core',
  }
  const equipLabel: Record<string, string> = {
    free_weight:'Free Weight', cable:'Cable', machine:'Machine',
  }
  // New ExEntry shape from JSON
  const primaryMuscleId = raw?.primary_muscle_ids?.[0] ?? ''
  const equipId         = raw?.equipment_ids?.[0] ?? ''
  return {
    name:         raw?.name  ?? 'Exercise',
    id:           raw?.id    ?? '',
    sets:         raw?.sets  ?? raw?.programming?.beginner?.sets ?? '3',
    reps:         raw?.reps  ?? raw?.programming?.beginner?.reps ?? '10',
    icon:         raw?.icon  ?? '🏋️',
    muscle:       muscleLabel[raw?.muscle ?? primaryMuscleId] ?? raw?.muscle ?? primaryMuscleId ?? '—',
    equipment:    equipLabel[raw?.equipment ?? equipId] ?? raw?.equipment ?? equipId ?? '—',
    level:        raw?.level ?? (raw?.programming ? 'Intermediate' : '—'),
    mechanics:    raw?.mechanics
                    ? raw.mechanics.charAt(0).toUpperCase() + raw.mechanics.slice(1)
                    : '—',
    instructions: raw?.instructions ?? raw?.how ?? '',
  }
}

export default function TrainingPage() {
  const navigate  = useNavigate()
  const location  = useLocation()

  const state = location.state as {
    exercises?: any[]; demoUrls?: Record<string, string>
    exercise?: any;    demoUrl?:  string | null
  } | null

  const [exerciseQueue, setExerciseQueue] = useState<any[]>(() =>
    state?.exercises ?? (state?.exercise ? [state.exercise] : [exercises[0]])
  )
  const demoUrls: Record<string, string> =
    state?.demoUrls
    ?? (state?.demoUrl && state?.exercise?.id ? { [state.exercise.id]: state.demoUrl } : {})

  const { profile }    = useAuthStore()
  const { startSession, endSession, recordHR } = useSessionStore()
  const { upsert: upsertPresence, clear: clearPresence } = usePresenceStore()

  const sessionIdRef = useRef<string | null>(null)
  const hrRef        = useRef(142)
  const setRef       = useRef(0)
  const elapsedRef   = useRef(0)
  const samplesRef   = useRef<number[]>([])
  const setCountsRef = useRef<Record<string, number>>({})

  const [exIndex, setExIndex]       = useState(0)
  const [hr, setHr]                 = useState(142)
  const [elapsed, setElapsed]       = useState(0)
  const [currentSet, setCurrentSet] = useState(0)
  const [setLog, setSetLog]         = useState<SetRecord[]>([])
  const [msgTab,       setMsgTab]      = useState<MsgTab>('HELP')
  const [armedMsg,     setArmedMsg]    = useState<BiMsg | null>(null)
  const [targetBuddy,  setTargetBuddy] = useState<string | null>(null)
  const [chatMsgs,     setChatMsgs]    = useState<TrainChatMsg[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatIdRef  = useRef(0)
  const [showExPicker, setShowExPicker] = useState(false)

  const rawEx   = exerciseQueue[Math.min(exIndex, exerciseQueue.length - 1)] ?? exercises[0]
  const ex      = resolveEx(rawEx)
  const demoUrl = demoUrls[rawEx?.id] ?? null

  const zone = hrZone(hr)
  const pct  = Math.min(100, Math.max(5, Math.round((hr - 60) / 1.2)))

  useEffect(() => {
    if (!profile) return
    startSession(profile.id, ex.name, ex.id).then(id => {
      sessionIdRef.current = id
      if (id) upsertPresence(profile.id, { session_id: id, exercise_name: ex.name, current_set: 0, current_hr: hrRef.current })
    })
    return () => { if (profile) clearPresence(profile.id) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.max(95, Math.min(175, hrRef.current + Math.floor((Math.random() - 0.38) * 7)))
      hrRef.current = next
      samplesRef.current.push(next)
      setHr(next)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => { elapsedRef.current += 1; setElapsed(elapsedRef.current) }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!profile) return
    const id = setInterval(() => {
      if (!sessionIdRef.current) return
      recordHR(sessionIdRef.current, hrRef.current)
      upsertPresence(profile.id, { session_id: sessionIdRef.current, exercise_name: ex.name, current_set: setRef.current, current_hr: hrRef.current })
    }, 10000)
    return () => clearInterval(id)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timers = TRAIN_DEMO.map(m =>
      setTimeout(() => setChatMsgs(prev => [...prev, { id: chatIdRef.current++, ...m }]), m.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [chatMsgs])

  function fmtMin(s: number) { return `${Math.floor(s / 60)}m` }

  function handleQueueSwitch(idx: number) {
    setCountsRef.current[ex.id || String(exIndex)] = setRef.current
    const saved = setCountsRef.current[resolveEx(exerciseQueue[idx] ?? exercises[0]).id || String(idx)] ?? 0
    setExIndex(idx)
    setRef.current = saved
    setCurrentSet(saved)
    setShowExPicker(false)
  }

  function handleNextSet() {
    const next = setRef.current + 1
    setSetLog(log => [...log, { exercise: ex.name, setNum: next, hr: hrRef.current }])
    setRef.current = next
    setCurrentSet(next)
    setCountsRef.current[ex.id || String(exIndex)] = next
  }

  async function handleEndSession() {
    const samples = samplesRef.current
    const avg_hr  = samples.length ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : hrRef.current
    const max_hr  = samples.length ? Math.max(...samples) : hrRef.current
    const sid     = sessionIdRef.current
    if (sid) await endSession(sid, { avg_hr, max_hr, sets_done: setLog.length, duration_s: elapsedRef.current })
    if (profile) await clearPresence(profile.id)
    navigate('/summary', { state: { sessionId: sid, elapsed: elapsedRef.current, sets: setLog.length, exercise: rawEx, setLog, liveSamples: samplesRef.current } })
  }

  const buddies = [
    { init:'XM', name:'Xiao Ming', status:'Bench 3/5', emoji:'💪', bg:'linear-gradient(135deg,rgba(65,120,255,0.35),rgba(29,200,187,0.25))', ring:'var(--z-green)' },
    { init:'XH', name:'Xiao Hong', status:'High HR',   emoji:'🔥', bg:'linear-gradient(135deg,rgba(239,68,68,0.3),rgba(245,158,11,0.2))',   ring:'var(--red)',    statusClass:'high' },
    { init:'XG', name:'Xiao Gang', status:'Resting',   emoji:'💪', bg:'linear-gradient(135deg,rgba(65,120,255,0.25),rgba(168,85,247,0.2))', ring:'var(--brand)', statusClass:'rest' },
  ]

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />


      <div className={`app-shell ${zone.bg}`} style={{ position:'relative', zIndex:1, height:'100vh', overflow:'hidden' }}>

        {/* ── Header ── */}
        <div className="train-hbar">
          <div className="train-hbar-top">
            <span className="fs11 t-m">In Session</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ textAlign:'right', lineHeight:1 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:700, color:'var(--lime)', letterSpacing:'-.02em' }}>
                  {fmtMin(elapsed)}
                </div>
                <div style={{ fontSize:9, color:'var(--mu)', marginTop:2, letterSpacing:'.06em', textTransform:'uppercase' }}>elapsed</div>
              </div>
              <button className="train-close-btn" onClick={handleEndSession}>End</button>
            </div>
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--tx)', margin:'5px 0 2px' }}>{ex.name}</div>
          <div className="train-hbar-sub">
            <span>{ex.sets} sets · {ex.reps} reps</span>
            <span>60 kg</span>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="content" style={{ gap:10, paddingTop:8, paddingBottom:8 }}>

          {/* HR + sets card */}
          <div className="card" style={{ padding:'10px 12px' }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              {/* Left: HR ring */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
                <div className="zone-legend" style={{ justifyContent:'center', gap:6 }}>
                  <span className="zone-pip"><span className="zone-dot" style={{ background:'var(--z-blue)' }} /><span className="fs10">&lt;120</span></span>
                  <span className="zone-pip"><span className="zone-dot" style={{ background:'var(--z-green)' }} /><span className="fs10">120–150</span></span>
                  <span className="zone-pip"><span className="zone-dot" style={{ background:'var(--z-red)' }} /><span className="fs10">&gt;150</span></span>
                </div>
                <div className="hr-ring" style={{ width:80, height:80, background:`conic-gradient(${zone.color} 0 ${pct}%, var(--s3) ${pct}% 100%)` }}>
                  <div className="hr-ring-num" style={{ fontSize:24, color:zone.color }}>{hr}</div>
                </div>
                <div style={{ textAlign:'center', lineHeight:1.2 }}>
                  <div className="hr-zone-lbl" style={{ fontSize:10, color:zone.color }}>{zone.label}</div>
                  <div className="hr-bpm-lbl" style={{ fontSize:9 }}>bpm</div>
                </div>
              </div>

              {/* Right: sets + queue + button */}
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5, minWidth:0 }}>
                {/* Set dots */}
                <div>
                  <div className="sec-lbl" style={{ marginBottom:3 }}>Sets</div>
                  <div className="set-dots">
                    {Array.from({ length: TOTAL_SETS }, (_, i) => (
                      <div key={i} className={`sdot${i < currentSet ? ' done' : i === currentSet ? ' cur' : ''}`} />
                    ))}
                  </div>
                </div>
                {/* Queue */}
                <div style={{ position:'relative' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                    <div className="sec-lbl" style={{ marginBottom:0 }}>
                      Queue{exerciseQueue.length > 1 ? ` (${exerciseQueue.length})` : ''}
                    </div>
                    <button
                      onClick={() => setShowExPicker(p => !p)}
                      style={{ width:16, height:16, borderRadius:'50%', border:`1px solid ${showExPicker ? 'var(--brand)' : 'var(--bd)'}`, background: showExPicker ? 'var(--brand-t)' : 'var(--s1)', color: showExPicker ? 'var(--brand)' : 'var(--mu)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, padding:0, flexShrink:0 }}
                    >+</button>
                  </div>
                  <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:3, maxHeight:52 }}>
                    {exerciseQueue.map((raw, idx) => {
                      const item  = resolveEx(raw)
                      const isCur = idx === exIndex
                      return (
                        <button
                          key={idx}
                          onClick={() => handleQueueSwitch(idx)}
                          style={{
                            display:'flex', alignItems:'center', gap:5,
                            padding:'4px 6px', borderRadius:6, cursor:'pointer',
                            background: isCur ? 'var(--s2)' : 'var(--s1)',
                            border: `1px solid ${isCur ? 'var(--lime)' : 'var(--bd)'}`,
                            textAlign:'left', minHeight:0, minWidth:0, width:'100%',
                          }}
                        >
                          <div style={{ flexShrink:0, width:14, height:14, borderRadius:'50%', background: isCur ? 'var(--lime)' : 'var(--s3)', color: isCur ? '#000' : 'var(--mu)', fontSize:8, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {idx + 1}
                          </div>
                          <div style={{ fontSize:10, fontWeight:700, color: isCur ? 'var(--lime)' : 'var(--tx)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', flex:1, minWidth:0 }}>
                            {item.name}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {showExPicker && (
                    <div style={{
                      position:'absolute', top:'100%', left:0, right:0, zIndex:50,
                      background:'var(--s0)', border:'1px solid var(--bd)', borderRadius:8,
                      maxHeight:130, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.35)',
                    }}>
                      {exercises
                        .filter(e => !exerciseQueue.some((q: any) => (q.id ?? q.exercise_id) === e.id))
                        .map(e => (
                          <button
                            key={e.id}
                            onClick={() => { setExerciseQueue(q => [...q, e]); setShowExPicker(false) }}
                            style={{
                              width:'100%', textAlign:'left', padding:'5px 9px',
                              background:'none', border:'none', borderBottom:'1px solid var(--bd)',
                              cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                              fontSize:10, color:'var(--tx)',
                            }}
                          >
                            <span style={{ fontSize:13 }}>{(e as any).icon ?? '🏋️'}</span>
                            <span>{e.name}</span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
                {/* Next set button */}
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button
                    className="btn-ghost fs11"
                    style={{ padding:'5px 10px', borderRadius:8 }}
                    onClick={handleNextSet}
                    disabled={currentSet >= TOTAL_SETS}
                  >
                    {currentSet >= TOTAL_SETS ? 'Done ✓' : 'Next Set ▶'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', borderTop:'1px solid var(--bd)', marginTop:10, paddingTop:8, gap:0 }}>
              <div style={{ flex:1, textAlign:'center', borderRight:'1px solid var(--bd)' }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:'var(--tx)', lineHeight:1 }}>{Math.floor(elapsed/60)}</div>
                <div style={{ fontSize:9, color:'var(--mu)', marginTop:2 }}>min</div>
              </div>
              <div style={{ flex:1, textAlign:'center', borderRight:'1px solid var(--bd)' }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:'var(--lime)', lineHeight:1 }}>{currentSet}</div>
                <div style={{ fontSize:9, color:'var(--mu)', marginTop:2 }}>sets done</div>
              </div>
              <div style={{ flex:1, textAlign:'center' }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:'var(--orange)', lineHeight:1 }}>{hr}</div>
                <div style={{ fontSize:9, color:'var(--mu)', marginTop:2 }}>avg bpm</div>
              </div>
            </div>
          </div>

          {/* Breathing hint */}
          <div className={`annot green ${zone.bg}`} style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, padding:'7px 10px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
            </svg>
            Breathing: {zone.hint}
          </div>

          {/* Exercise demo — left: gif/image, right: info */}
          <div className="card" style={{ padding:'10px 12px' }}>
            <div className="row-between" style={{ marginBottom:8 }}>
              <div className="sec-lbl" style={{ marginBottom:0 }}>Exercise Demo</div>
              <span className="t-b fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/exercise')}>Switch ↗</span>
            </div>
            <div style={{ display:'flex', gap:11, alignItems:'stretch' }}>

              {/* Left: demo gif/image */}
              <div style={{ flexShrink:0, width:120, borderRadius:10, overflow:'hidden', background:'linear-gradient(145deg,var(--brand-t),var(--teal-t))', display:'grid', placeItems:'center' }}>
                {demoUrl
                  ? <img src={demoUrl} alt={ex.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontSize:44 }}>{ex.icon}</span>
                }
              </div>

              {/* Right: title + subtitle info */}
              <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:5 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--tx)', lineHeight:1.2 }}>
                  {ex.name}
                </div>
                <div style={{ fontSize:11, color:'var(--mu)' }}>
                  {ex.muscle} · {ex.equipment}
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:1 }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'var(--brand-t)', color:'var(--brand)', border:'1px solid rgba(65,120,255,0.25)' }}>
                    {ex.mechanics}
                  </span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'var(--lime-t)', color:'var(--lime)', border:'1px solid rgba(200,240,60,0.25)' }}>
                    {ex.level}
                  </span>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--tx)', marginTop:2 }}>
                  {ex.sets} sets · {ex.reps} reps
                </div>
                {ex.instructions && (
                  <div className="clamp-3" style={{ fontSize:10, color:'var(--mu)', lineHeight:1.5, marginTop:1 }}>
                    {ex.instructions}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* ── Bottom panel: chat + send + buddies + end ── */}
        <div style={{ flexShrink:0, borderTop:'1px solid var(--bd)', background:'var(--s0)', padding:'7px 12px 0' }}>

          {/* Receive messages */}
          {chatMsgs.length > 0 && (
            <div style={{ maxHeight:92, overflowY:'auto', display:'flex', flexDirection:'column', gap:6, marginBottom:6 }}>
              {chatMsgs.map(msg => (
                <div key={msg.id} style={{ display:'flex', alignItems:'flex-end', gap:5, flexDirection: msg.isSelf ? 'row' : 'row-reverse' }}>
                  <div
                    className={`avatar av-sm${msg.isCoach ? ' av-coach' : ''}`}
                    style={msg.isSelf ? { background:'var(--brand)', color:'#fff', flexShrink:0 } : { flexShrink:0 }}
                  >{msg.initials}</div>
                  <div style={{
                    maxWidth:190, padding:'4px 9px',
                    background: msg.isSelf ? 'var(--brand)' : msg.isCoach ? 'rgba(65,120,255,0.13)' : 'var(--s2)',
                    border: `1px solid ${msg.isSelf ? 'transparent' : msg.isCoach ? 'rgba(65,120,255,0.3)' : 'var(--bd)'}`,
                    borderRadius: msg.isSelf ? '10px 10px 10px 2px' : '10px 10px 2px 10px',
                  }}>
                    <div style={{ fontSize:8, fontWeight:700, marginBottom:1, color: msg.isSelf ? 'rgba(255,255,255,0.7)' : msg.isCoach ? 'var(--brand)' : 'var(--lime)' }}>{msg.name}</div>
                    <div style={{ fontSize:11, color: msg.isSelf ? '#fff' : 'var(--tx)', lineHeight:1.35 }}>
                      {msg.textEn}{msg.textZh && msg.textZh !== msg.textEn ? <span style={{ color: msg.isSelf ? 'rgba(255,255,255,0.65)' : 'var(--mu)', fontSize:10 }}> · {msg.textZh}</span> : null}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Compact send */}
          <div style={{ marginBottom:6 }}>
            <div style={{ display:'flex', gap:4, marginBottom:5 }}>
              {(['HELP','HOW','HI'] as MsgTab[]).map(t => (
                <button key={t} onClick={() => { setMsgTab(t); setArmedMsg(null) }} style={{
                  padding:'3px 8px', fontSize:11, borderRadius:5, cursor:'pointer',
                  background: msgTab === t ? 'var(--brand-t)' : 'transparent',
                  border: `1px solid ${msgTab === t ? 'var(--brand)' : 'var(--bd)'}`,
                  color:   msgTab === t ? 'var(--brand)' : 'var(--mu)',
                  fontWeight:700,
                }}>{GYM_TAB_ICON[t]}</button>
              ))}
              {armedMsg && (
                <span style={{ marginLeft:'auto', fontSize:9, color:'var(--mu)', alignSelf:'center' }}>
                  {targetBuddy ? `→ ${targetBuddy}` : 'tap a buddy →'}
                </span>
              )}
            </div>
            <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:2 }}>
              {getMsgList(msgTab).map((m, i) => {
                const active = armedMsg?.en === m.en
                const isHi   = msgTab === 'HI'
                return (
                  <button key={i} onClick={() => setArmedMsg(active ? null : m)} style={{
                    flexShrink:0, padding: isHi ? '4px 8px' : '3px 9px',
                    fontSize: isHi ? 15 : 10, borderRadius:12, cursor:'pointer', whiteSpace:'nowrap',
                    background: active ? 'var(--brand)' : 'var(--s1)',
                    border: `1px solid ${active ? 'var(--brand)' : 'var(--bd)'}`,
                    color: active ? '#fff' : 'var(--tx)',
                    display:'flex', flexDirection: isHi ? 'row' : 'column', alignItems:'center', gap:1,
                  }}>
                    {isHi ? <span>{m.en} <span style={{ fontSize:9 }}>{m.zh}</span></span>
                          : <><span>{m.en}</span><span style={{ fontSize:8, opacity: active ? 0.8 : 0.5 }}>{m.zh}</span></>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Buddies row + Map link */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
            <div className="buddy-strip" style={{ flex:1, gap:6 }}>
              {buddies.map(b => (
                <div
                  key={b.init}
                  className="buddy-chip"
                  style={{
                    width:64, padding:'5px 4px',
                    borderColor: targetBuddy === b.name ? 'var(--brand)' : undefined,
                    cursor:'pointer',
                  }}
                  onClick={() => {
                    if (armedMsg) {
                      const selfInit = profile ? (profile.username ?? 'ME').slice(0,2).toUpperCase() : 'ME'
                      setChatMsgs(prev => [...prev, {
                        id: chatIdRef.current++, name:'You', initials:selfInit,
                        textEn:armedMsg.en, textZh:armedMsg.zh, isCoach:false, isSelf:true,
                      }])
                      setArmedMsg(null)
                      setTargetBuddy(null)
                    } else {
                      setTargetBuddy(t => t === b.name ? null : b.name)
                    }
                  }}
                >
                  <div className="avatar-wrap">
                    <div className="online-ring" style={{ borderColor:b.ring }} />
                    <div className="avatar av-sm" style={{ background:b.bg }}>{b.init}</div>
                  </div>
                  <div className="buddy-chip-name" style={{ fontSize:9 }}>{b.name}</div>
                  <div className={`buddy-chip-status${(b as any).statusClass ? ' '+(b as any).statusClass : ''}`} style={{ fontSize:8 }}>{b.status}</div>
                </div>
              ))}
            </div>
            <span
              className="t-b fs11"
              style={{ cursor:'pointer', flexShrink:0 }}
              onClick={() => navigate('/buddies', { state:{ fromSession:true } })}
            >Map →</span>
          </div>

          {/* End session */}
          <div style={{ paddingBottom:16 }}>
            <button className="btn-danger" onClick={handleEndSession} style={{ padding:12, fontSize:14, letterSpacing:'.05em', width:'100%' }}>
              END SESSION
            </button>
          </div>

        </div>

      </div>
    </>
  )
}
