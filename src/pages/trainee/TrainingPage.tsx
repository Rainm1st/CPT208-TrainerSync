import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { usePresenceStore } from '../../store/presenceStore'
import type { Exercise } from '../../data/exercises'
import { exercises } from '../../data/exercises'

const TOTAL_SETS = 5

function hrZone(bpm: number) {
  if (bpm < 120) return { color:'var(--z-blue)',  label:'Warm Up Zone',   bg:'bth-blue',  hint:'BLUE · slow pulse · build up' }
  if (bpm < 150) return { color:'var(--z-green)', label:'In Target Zone', bg:'bth-green', hint:'GREEN · 3s pulse · maintain target zone' }
  return              { color:'var(--z-red)',   label:'High Intensity!', bg:'bth-red',   hint:'RED · fast pulse · ease off!' }
}

export default function TrainingPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const ex: Exercise = (location.state as { exercise?: Exercise })?.exercise ?? exercises[0]

  const { profile }    = useAuthStore()
  const { startSession, endSession, recordHR } = useSessionStore()
  const { upsert: upsertPresence, clear: clearPresence } = usePresenceStore()

  // Refs for interval callbacks (avoid stale closure)
  const sessionIdRef = useRef<string | null>(null)
  const hrRef        = useRef(142)
  const setRef       = useRef(0)
  const elapsedRef   = useRef(0)
  const samplesRef   = useRef<number[]>([])

  const [hr, setHr]             = useState(142)
  const [elapsed, setElapsed]   = useState(0)
  const [currentSet, setCurrentSet] = useState(0)
  const [burst, setBurst]       = useState<string|null>(null)

  const zone = hrZone(hr)
  const pct  = Math.min(100, Math.max(5, Math.round((hr - 60) / 1.2)))

  // Start session once on mount
  useEffect(() => {
    if (!profile) return
    startSession(profile.id, ex.name, ex.id).then(id => {
      sessionIdRef.current = id
      if (id) upsertPresence(profile.id, { session_id: id, exercise_name: ex.name, current_set: 0, current_hr: hrRef.current })
    })
    return () => { if (profile) clearPresence(profile.id) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Simulated HR fluctuation
  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.max(95, Math.min(175, hrRef.current + Math.floor((Math.random() - 0.38) * 7)))
      hrRef.current = next
      samplesRef.current.push(next)
      setHr(next)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // Elapsed timer
  useEffect(() => {
    const id = setInterval(() => {
      elapsedRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Record HR + upsert presence every 10s
  useEffect(() => {
    if (!profile) return
    const id = setInterval(() => {
      if (!sessionIdRef.current) return
      recordHR(sessionIdRef.current, hrRef.current)
      upsertPresence(profile.id, {
        session_id: sessionIdRef.current,
        exercise_name: ex.name,
        current_set: setRef.current,
        current_hr: hrRef.current,
      })
    }, 10000)
    return () => clearInterval(id)
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  function fmtMin(s: number) { return `${Math.floor(s / 60)}m` }
  function sendBurst(e: string) { setBurst(e); setTimeout(() => setBurst(null), 900) }

  function advanceSet() {
    if (setRef.current < TOTAL_SETS - 1) {
      setRef.current += 1
      setCurrentSet(setRef.current)
    }
  }

  async function handleEndSession() {
    const samples  = samplesRef.current
    const avg_hr   = samples.length ? Math.round(samples.reduce((a,b) => a+b,0) / samples.length) : hrRef.current
    const max_hr   = samples.length ? Math.max(...samples) : hrRef.current
    const sid      = sessionIdRef.current
    if (sid) await endSession(sid, { avg_hr, max_hr, sets_done: setRef.current, duration_s: elapsedRef.current })
    if (profile) await clearPresence(profile.id)
    navigate('/summary', { state: { sessionId: sid, elapsed: elapsedRef.current, sets: setRef.current, exercise: ex } })
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />

      {burst && (
        <div style={{ position:'fixed',inset:0,zIndex:999,pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ fontSize:80, animation:'emojiBurst 0.9s ease-out forwards' }}>{burst}</span>
        </div>
      )}

      <div className={`app-shell ${zone.bg}`} style={{ position:'relative', zIndex:1 }}>

        <div className="train-hbar">
          <div className="train-hbar-top">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="fs11 t-m">In Session</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ textAlign:'right', lineHeight:1 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:700, color:'var(--lime)', letterSpacing:'-.02em', lineHeight:1 }}>
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

        <div className="content" style={{ gap:10, paddingTop:8 }}>

          <div className="card" style={{ padding:'10px 12px' }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>

              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
                <div className="zone-legend" style={{ justifyContent:'center', gap:6 }}>
                  <span className="zone-pip"><span className="zone-dot" style={{ background:'var(--z-blue)' }} /><span className="fs10">&lt;120</span></span>
                  <span className="zone-pip"><span className="zone-dot" style={{ background:'var(--z-green)' }} /><span className="fs10">120–150</span></span>
                  <span className="zone-pip"><span className="zone-dot" style={{ background:'var(--z-red)' }} /><span className="fs10">&gt;150</span></span>
                </div>
                <div
                  className="hr-ring"
                  style={{ width:80, height:80, background:`conic-gradient(${zone.color} 0 ${pct}%, var(--s3) ${pct}% 100%)` }}
                >
                  <div className="hr-ring-num" style={{ fontSize:24, color:zone.color }}>{hr}</div>
                </div>
                <div style={{ textAlign:'center', lineHeight:1.2 }}>
                  <div className="hr-zone-lbl" style={{ fontSize:10, color:zone.color }}>{zone.label}</div>
                  <div className="hr-bpm-lbl" style={{ fontSize:9 }}>bpm</div>
                </div>
              </div>

              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                <div>
                  <div className="sec-lbl" style={{ marginBottom:4 }}>Sets</div>
                  <div className="set-dots">
                    {Array.from({ length: TOTAL_SETS }, (_, i) => (
                      <div key={i} className={`sdot${i < currentSet ? ' done' : i === currentSet ? ' cur' : ''}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="sec-lbl" style={{ marginBottom:4 }}>Speed</div>
                  <div className="w-slider">
                    <span>S</span>
                    <div className="slider-track"><div className="slider-thumb" /></div>
                    <span>F</span>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button
                    className="btn-ghost fs11"
                    style={{ padding:'5px 10px', borderRadius:8 }}
                    onClick={advanceSet}
                    disabled={currentSet >= TOTAL_SETS - 1}
                  >
                    {currentSet >= TOTAL_SETS - 1 ? 'Done ✓' : 'Next Set ▶'}
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

          <div className={`annot green ${zone.bg}`} style={{ display:'flex', alignItems:'center', gap:7, fontSize:11, padding:'7px 10px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
            </svg>
            Breathing: {zone.hint}
          </div>

          <div className="card" style={{ padding:'10px 12px' }}>
            <div className="row-between" style={{ marginBottom:7 }}>
              <div className="sec-lbl" style={{ marginBottom:0 }}>Exercise Demo</div>
              <span className="t-b fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/exercise')}>Switch ↗</span>
            </div>
            <div style={{ height:100, borderRadius:10, overflow:'hidden', background:'linear-gradient(145deg,var(--brand-t),var(--teal-t))', display:'grid', placeItems:'center', fontSize:40 }}>
              {ex.icon}
            </div>
          </div>

          <div>
            <div className="row-between" style={{ marginBottom:10 }}>
              <div className="sec-lbl" style={{ marginBottom:0 }}>Nearby</div>
              <span className="t-b fs11" style={{ cursor:'pointer' }} onClick={() => navigate('/buddies')}>Map →</span>
            </div>
            <div className="buddy-strip">
              {[
                { init:'XM', name:'Xiao Ming', status:'Bench 3/5', emoji:'💪', bg:'linear-gradient(135deg,rgba(65,120,255,0.35),rgba(29,200,187,0.25))', ring:'var(--z-green)' },
                { init:'XH', name:'Xiao Hong', status:'High HR',   emoji:'🔥', bg:'linear-gradient(135deg,rgba(239,68,68,0.3),rgba(245,158,11,0.2))',   ring:'var(--red)',    statusClass:'high' },
                { init:'XG', name:'Xiao Gang', status:'Resting',   emoji:'💪', bg:'linear-gradient(135deg,rgba(65,120,255,0.25),rgba(168,85,247,0.2))', ring:'var(--brand)', statusClass:'rest' },
              ].map(b => (
                <div key={b.init} className="buddy-chip" onClick={() => navigate('/buddies')}>
                  <div className="avatar-wrap online">
                    <div className="online-ring" style={{ borderColor:b.ring }} />
                    <div className="avatar av-md" style={{ background:b.bg }}>{b.init}</div>
                  </div>
                  <div className="buddy-chip-name">{b.name}</div>
                  <div className={`buddy-chip-status${(b as any).statusClass ? ' '+(b as any).statusClass : ''}`}>{b.status}</div>
                  <div className="int-btns" style={{ marginTop:5, justifyContent:'center' }}>
                    <div className="int-btn" onClick={e => { e.stopPropagation(); sendBurst(b.emoji) }}>{b.emoji}</div>
                    <div className="int-btn" onClick={e => { e.stopPropagation(); navigate('/buddies') }}>💬</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-danger" onClick={handleEndSession} style={{ padding:13, fontSize:14, letterSpacing:'.04em' }}>
            END SESSION
          </button>

        </div>
      </div>
    </>
  )
}
