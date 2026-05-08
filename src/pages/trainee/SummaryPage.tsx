import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import type { Exercise } from '../../data/exercises'
import type { SetRecord } from './TrainingPage'
import { useTheme } from '../../hooks/useTheme'

const ACHIEVEMENTS = [
  { medal:'🥇', title:'PR Bench Press', sub:'Vol. 3,000 kg' },
  { medal:'🏅', title:'5-Day Streak',   sub:'5 days in a row' },
  { medal:'🎯', title:'Zone 70%',       sub:'31 min target' },
  { medal:'⚡', title:'High Volume',    sub:'8 exercises done' },
]

function zoneColor(bpm: number) {
  return bpm > 150 ? 'var(--z-red)' : bpm > 120 ? 'var(--z-green)' : 'var(--z-blue)'
}

export default function SummaryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as {
    sessionId?: string; elapsed?: number; sets?: number; exercise?: Exercise
    setLog?: SetRecord[]; liveSamples?: number[]
  } | null

  const { theme, toggle } = useTheme()
  const { currentSessionDetail, fetchSessionDetail } = useSessionStore()

  useEffect(() => {
    if (state?.sessionId) fetchSessionDetail(state.sessionId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [setLog, setSetLog]       = useState<SetRecord[]>(state?.setLog ?? [])

  const isFreshSession = Array.isArray(state?.liveSamples)
  const [isGenerating, setIsGenerating] = useState(isFreshSession)

  useEffect(() => {
    if (!isFreshSession) return
    const t = setTimeout(() => setIsGenerating(false), 5000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sd = currentSessionDetail

  const durationMin = sd?.duration_s != null ? Math.round(sd.duration_s / 60) : state?.elapsed ? Math.floor(state.elapsed / 60) : 45
  const avgHr       = sd?.avg_hr   ?? 142
  const maxHr       = sd?.max_hr   ?? 168
  const setsDone    = setLog.length || sd?.sets_done || state?.sets || 8
  const exName      = sd?.exercise_name ?? state?.exercise?.name ?? 'Chest Day'
  const dateStr     = sd ? new Date(sd.started_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'Today'

  function buildRecap() {
    const intensity = maxHr > 160 ? 'high-intensity' : maxHr > 140 ? 'moderate' : 'steady'
    const zoneNote  = hasRealHR
      ? (targetPct >= 60
          ? `spending ${targetPct}% of the session in the target zone — solid zone discipline`
          : `with ${targetPct}% in the target zone — pacing can be dialled in further`)
      : 'tracking sets carefully throughout'
    return `You completed ${setsDone} sets of ${exName} over ${durationMin} min, averaging ${avgHr} bpm with a peak of ${maxHr} bpm. A ${intensity} effort, ${zoneNote}.`
  }

  function buildSuggestion() {
    if (maxHr > 165) return `Your HR peaked quite high today. Next session, extend rest periods to 90 s between sets and finish with a 10-min light walk — it clears lactate noticeably faster than sitting still.`
    if (hasRealHR && targetPct < 50) return `Less than half the session landed in the target zone. A structured 5-min warm-up (light cardio + dynamic stretch) before the main work will help you hit the zone earlier and hold it.`
    if (durationMin < 20) return `Short session today — totally fine for a deload or recovery day. When you're ready to push again, aim for 35–45 min to maximise zone exposure and training stimulus.`
    if (setsDone >= 8) return `Good volume. Let the same muscle group rest 48 h before hitting it again — active recovery tomorrow (a walk or light stretch) will accelerate repair more than a full rest day.`
    return `Consistent effort. To keep progressing, add 2.5 kg or one extra set next time you run this exercise. Small, regular overload compounds quickly over a few weeks.`
  }

  // Use live samples from TrainingPage first, fall back to DB hr_samples
  const liveSamples: number[] = state?.liveSamples ?? []
  const dbSamples   = sd?.hr_samples ?? []
  const allBpms: number[] = liveSamples.length > 0 ? liveSamples : dbSamples.map(s => s.bpm)
  const hasRealHR   = allBpms.length > 0

  // Zone distribution
  const belowCount  = allBpms.filter(b => b < 120).length
  const targetCount = allBpms.filter(b => b >= 120 && b <= 150).length
  const highCount   = allBpms.filter(b => b > 150).length
  const total       = allBpms.length || 1

  const belowPct    = Math.round(belowCount  / total * 100)
  const highPct     = Math.round(highCount   / total * 100)
  const targetPct   = 100 - belowPct - highPct

  const sampleSec   = liveSamples.length > 0 ? 2 : 10
  const belowMin    = Math.round(belowCount  * sampleSec / 60)
  const targetMin   = Math.round(targetCount * sampleSec / 60)
  const highMin     = Math.round(highCount   * sampleSec / 60)

  // Build colored-dot chart — returns pts + the Y coordinates for the 120/150 zone lines
  function buildChart() {
    if (allBpms.length < 2) return null
    const MAX = 40
    const src = allBpms.length > MAX
      ? allBpms.filter((_, i) => i % Math.ceil(allBpms.length / MAX) === 0).slice(0, MAX)
      : allBpms
    const maxB  = Math.max(...src, 155)
    const minB  = Math.min(...src, 110)
    const range = Math.max(maxB - minB, 30)
    const toY   = (b: number) => Math.round(70 - ((b - minB) / range) * 55)
    const step  = 340 / Math.max(src.length - 1, 1)
    const pts = src.map((b, i) => ({
      x: Math.round(i * step), y: toY(b), bpm: b,
      color: b > 150 ? 'var(--z-red)' : b >= 120 ? 'var(--z-green)' : 'var(--z-blue)',
    }))
    return { pts, y120: toY(120), y150: toY(150) }
  }

  const chart = buildChart()

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate('/map')}>← Back</button>
          <span className="hbar-ttl">Session Report</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span className="fs11 t-m">{dateStr}</span>
            <button className="theme-toggle-btn" style={{ width:28, height:28, fontSize:13 }} onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </div>

        <div className="content" style={{ gap:7 }}>

          {/* Hero KPI strip */}
          <div className="p4-hero">
            <div className="p4-kpi">
              <div className="p4-kpi-val">{durationMin}</div>
              <div className="p4-kpi-unit">min</div>
            </div>
            <div className="p4-kpi-div" />
            <div className="p4-kpi">
              <div className="p4-kpi-val" style={{ color:'var(--lime)' }}>{avgHr}</div>
              <div className="p4-kpi-unit">avg bpm</div>
            </div>
            <div className="p4-kpi-div" />
            <div className="p4-kpi">
              <div className="p4-kpi-val" style={{ color:'var(--orange)' }}>{maxHr}</div>
              <div className="p4-kpi-unit">max bpm</div>
            </div>
            <div className="p4-kpi-div" />
            <div className="p4-kpi">
              <div className="p4-kpi-val">{setsDone}</div>
              <div className="p4-kpi-unit">sets</div>
            </div>
          </div>

          {/* HR Timeline */}
          <div className="card" style={{ padding:'10px 12px 8px' }}>
            <div className="row-between" style={{ marginBottom:6 }}>
              <div className="card-ttl" style={{ marginBottom:0 }}>HR Timeline</div>
              <div style={{ display:'flex', gap:5 }}>
                <span className="p4-zone-pill blue">Below</span>
                <span className="p4-zone-pill green">Target</span>
                <span className="p4-zone-pill red">High</span>
              </div>
            </div>

            <svg viewBox="0 0 340 80" width="100%" style={{ display:'block', overflow:'visible' }}>
              {chart ? (
                <>
                  {/* Target zone band — aligned to actual 120/150 bpm in data scale */}
                  <rect x="0" y={chart.y150} width="340" height={chart.y120 - chart.y150} fill="rgba(34,197,94,0.07)" />
                  <line x1="0" y1={chart.y150} x2="340" y2={chart.y150} stroke="rgba(239,68,68,0.35)"   strokeWidth="1" strokeDasharray="4 3" />
                  <line x1="0" y1={chart.y120} x2="340" y2={chart.y120} stroke="rgba(96,165,250,0.35)"  strokeWidth="1" strokeDasharray="4 3" />
                  {/* Connecting line */}
                  <polyline
                    points={chart.pts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="var(--bd2)" strokeWidth="1.5" strokeLinejoin="round"
                  />
                  {/* Colored dots */}
                  {chart.pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={p.color} />
                  ))}
                </>
              ) : (
                <>
                  <rect x="0" y="18" width="340" height="35" fill="rgba(34,197,94,0.07)" />
                  <line x1="0" y1="18" x2="340" y2="18" stroke="rgba(239,68,68,0.35)"  strokeWidth="1" strokeDasharray="4 3" />
                  <line x1="0" y1="53" x2="340" y2="53" stroke="rgba(96,165,250,0.35)" strokeWidth="1" strokeDasharray="4 3" />
                  <text x="170" y="44" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="10">No HR data recorded</text>
                </>
              )}
            </svg>

            <div style={{ display:'flex', justifyContent:'space-between', padding:'0 1px', marginTop:3 }}>
              {['0m', `${Math.round(durationMin * 0.25)}m`, `${Math.round(durationMin * 0.5)}m`, `${Math.round(durationMin * 0.75)}m`, `${durationMin}m`].map((t, i) => (
                <span key={i} className="fs10 t-m">{t}</span>
              ))}
            </div>

            {/* Zone bar */}
            <div className="p4-zone-bar-wrap" style={{ margin:'6px 0 4px' }}>
              <div className="p4-zone-seg" style={{ width:`${hasRealHR ? belowPct : 15}%`,  background:'var(--z-blue)' }} />
              <div className="p4-zone-seg" style={{ width:`${hasRealHR ? targetPct : 70}%`, background:'var(--z-green)' }} />
              <div className="p4-zone-seg" style={{ width:`${hasRealHR ? highPct : 15}%`,   background:'var(--z-red)' }} />
            </div>
            <div className="p4-zone-inline">
              {hasRealHR ? (
                <>
                  <span className="p4-zone-tag" style={{ color:'var(--z-blue)' }}>{belowPct}% · {belowMin} min</span>
                  <span className="p4-zone-tag" style={{ color:'var(--z-green)' }}>{targetPct}% · {targetMin} min ✓</span>
                  <span className="p4-zone-tag" style={{ color:'var(--z-red)' }}>{highPct}% · {highMin} min</span>
                </>
              ) : (
                <>
                  <span className="p4-zone-tag" style={{ color:'var(--z-blue)' }}>15% · warm up</span>
                  <span className="p4-zone-tag" style={{ color:'var(--z-green)' }}>70% · target ✓</span>
                  <span className="p4-zone-tag" style={{ color:'var(--z-red)' }}>15% · high</span>
                </>
              )}
            </div>
          </div>

          {/* Set log */}
          <div className="card" style={{ padding:'9px 12px' }}>
            <div className="row-between" style={{ marginBottom:6 }}>
              <div className="card-ttl" style={{ marginBottom:0 }}>
                Set Log {setLog.length > 0 && <span style={{ color:'var(--mu)', fontWeight:400, fontSize:11 }}>· {setLog.length} sets</span>}
              </div>
            </div>
            {setLog.length > 0 ? (
              <div className="p4-ex-grid">
                {setLog.map((s, i) => (
                  <div key={i} className="p4-ex-cell">
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span className="p4-ex-num">{i + 1}</span>
                      <span className="p4-ex-name" style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:72 }}>{s.exercise}</span>
                    </div>
                    <div className="p4-ex-meta">Set {s.setNum}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div className="p4-ex-hr" style={{ color:zoneColor(s.hr) }}>
                        {s.hr}<span className="p4-ex-hr-unit">bpm</span>
                      </div>
                      <button
                        onClick={() => setSetLog(log => log.filter((_, j) => j !== i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--mu)', fontSize:13, padding:'0 2px', lineHeight:1, flexShrink:0 }}
                        title="Remove"
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color:'var(--mu)', fontSize:12, lineHeight:1.6 }}>
                {setsDone} sets completed · {durationMin} min · avg {avgHr} bpm
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="card p4-achieve-card" style={{ padding:'9px 12px' }}>
            <div className="card-ttl" style={{ marginBottom:6, color:'var(--amber)' }}>Achievements</div>
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

          {/* Coach note */}
          <div className="p4-coach-note">
            <div className="p4-coach-avatar">CW</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="p4-coach-name">Coach Wang <span className="p4-coach-tag">Coach</span></div>
              <div className="p4-coach-msg">"Great session. Watch HR on heavy sets — peaked {maxHr} bpm. Rest 90s between sets."</div>
            </div>
          </div>

          {/* AI Assistant recap */}
          <div className="card" style={{ padding:'12px 13px 11px' }}>
            <style>{`
              @keyframes ts-star-spin  { from{transform:rotate(0deg)}  to{transform:rotate(360deg)} }
              @keyframes ts-dot-pulse  { 0%,100%{opacity:.35} 50%{opacity:1} }
              @keyframes ts-text-in    { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
              .ts-star { animation: ts-star-spin 2.2s linear infinite; transform-origin:center; display:block; }
              .ts-thinking { animation: ts-dot-pulse 1.5s ease-in-out infinite; }
              .ts-text-reveal { animation: ts-text-in 0.45s ease forwards; }
            `}</style>

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
              <span style={{ fontSize:26, lineHeight:1 }}>🐱</span>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:900, letterSpacing:'.02em', lineHeight:1.1 }}>
                  <span className="brand-primary">TRAINER</span><span className="brand-lime">SYNC</span>
                </div>
                <div style={{ fontSize:8, color:'var(--mu)', letterSpacing:'1px', textTransform:'uppercase', marginTop:1 }}>Intelligent Assistant</div>
              </div>
            </div>

            <div style={{ padding:'10px 11px', borderRadius:11, background:'rgba(65,120,255,0.08)', border:'1px solid rgba(65,120,255,0.22)' }}>

              {/* ── Recap block ── */}
              <div style={{ marginBottom:9 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--brand)' }}>Recap</span>
                {isGenerating ? (
                  <div className="ts-thinking" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px 0', color:'var(--mu)', fontSize:11 }}>
                    <svg className="ts-star" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color:'rgba(65,120,255,0.7)', flexShrink:0 }}>
                      <path d="M12 2 L13.8 9.8 L22 12 L13.8 14.2 L12 22 L10.2 14.2 L2 12 L10.2 9.8 Z"/>
                    </svg>
                    thinking...
                  </div>
                ) : (
                  <div className="ts-text-reveal" style={{ fontSize:10, lineHeight:1.65, color:'var(--tx)', marginTop:4 }}>
                    {buildRecap()}
                  </div>
                )}
              </div>

              <div style={{ height:1, background:'var(--bd)', marginBottom:9 }} />

              {/* ── Suggestion block ── */}
              <div>
                <span style={{ fontSize:10, fontWeight:700, color:'var(--lime)' }}>Suggestion</span>
                {isGenerating ? (
                  <div className="ts-thinking" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px 0', color:'var(--mu)', fontSize:11 }}>
                    <svg className="ts-star" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color:'rgba(65,120,255,0.7)', flexShrink:0 }}>
                      <path d="M12 2 L13.8 9.8 L22 12 L13.8 14.2 L12 22 L10.2 14.2 L2 12 L10.2 9.8 Z"/>
                    </svg>
                    thinking...
                  </div>
                ) : (
                  <div className="ts-text-reveal" style={{ fontSize:10, lineHeight:1.65, color:'var(--tx)', marginTop:4 }}>
                    {buildSuggestion()}
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Fixed action bar */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100, background:'var(--s0)', borderTop:'1px solid var(--bd)' }}>
        <div style={{ maxWidth:430, margin:'0 auto', padding:'10px 16px 20px', display:'flex', gap:8 }}>
          <button className="btn-ghost" style={{ flex:'0 0 auto', width:'32%', fontSize:12, padding:'10px 8px' }}>Share Log</button>
          <button className="btn-primary" style={{ flex:1, width:'auto', fontSize:13 }} onClick={() => navigate('/map')}>Back to Home</button>
        </div>
      </div>
    </>
  )
}
