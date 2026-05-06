import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '../../store/sessionStore'
import type { Exercise } from '../../data/exercises'

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
  const state = location.state as { sessionId?: string; elapsed?: number; sets?: number; exercise?: Exercise } | null

  const { currentSessionDetail, fetchSessionDetail } = useSessionStore()

  useEffect(() => {
    if (state?.sessionId) fetchSessionDetail(state.sessionId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sd = currentSessionDetail

  const durationMin = sd?.duration_s != null ? Math.round(sd.duration_s / 60) : state?.elapsed ? Math.floor(state.elapsed / 60) : 45
  const avgHr       = sd?.avg_hr   ?? 142
  const maxHr       = sd?.max_hr   ?? 168
  const setsDone    = sd?.sets_done ?? state?.sets ?? 8
  const exName      = sd?.exercise_name ?? state?.exercise?.name ?? 'Chest Day'
  const dateStr     = sd ? new Date(sd.started_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'Today'

  const hrSamples   = sd?.hr_samples ?? []
  const hasRealHR   = hrSamples.length > 0

  // Compute zone distribution from real HR samples
  const belowCount  = hrSamples.filter(s => s.bpm < 120).length
  const targetCount = hrSamples.filter(s => s.bpm >= 120 && s.bpm <= 150).length
  const highCount   = hrSamples.filter(s => s.bpm > 150).length
  const total       = hrSamples.length || 1

  const belowPct    = Math.round(belowCount  / total * 100)
  const highPct     = Math.round(highCount   / total * 100)
  const targetPct   = 100 - belowPct - highPct

  // Each hr_sample is recorded ~every 10s
  const sampleSec   = 10
  const belowMin    = Math.round(belowCount  * sampleSec / 60)
  const targetMin   = Math.round(targetCount * sampleSec / 60)
  const highMin     = Math.round(highCount   * sampleSec / 60)

  // Build real HR chart polyline from samples (downsample to 11 points max)
  function buildPolyline() {
    const pts = hrSamples.length > 11
      ? hrSamples.filter((_, i) => i % Math.floor(hrSamples.length / 11) === 0).slice(0, 11)
      : hrSamples
    if (pts.length < 2) return null
    const maxB = Math.max(...pts.map(s => s.bpm))
    const minB = Math.min(...pts.map(s => s.bpm))
    const range = Math.max(maxB - minB, 1)
    const toY   = (b: number) => Math.round(70 - ((b - minB) / range) * 55)
    const step  = 340 / (pts.length - 1)
    return pts.map((s, i) => `${Math.round(i * step)},${toY(s.bpm)}`).join(' ')
  }

  const polyline = hasRealHR ? buildPolyline() : null

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate('/map')}>← Back</button>
          <span className="hbar-ttl">Session Report</span>
          <span className="fs11 t-m">{dateStr}</span>
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
              <rect x="0" y="15" width="340" height="40" fill="rgba(34,197,94,0.06)" />
              <line x1="0" y1="15" x2="340" y2="15" stroke="rgba(34,197,94,0.2)" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="55" x2="340" y2="55" stroke="rgba(34,197,94,0.2)" strokeWidth="1" strokeDasharray="4 4" />
              <polyline
                points={polyline ?? '0,58 34,50 68,35 102,28 136,30 170,32 204,18 238,32 272,38 306,44 340,52'}
                fill="none"
                stroke={hasRealHR ? 'var(--brand)' : 'var(--z-green)'}
                strokeWidth="2"
                strokeLinejoin="round"
              />
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

          {/* Exercise log */}
          <div className="card" style={{ padding:'9px 12px' }}>
            <div className="card-ttl" style={{ marginBottom:6 }}>
              {exName} {hasRealHR && `· ${hrSamples.length} HR samples`}
            </div>
            {hasRealHR ? (
              <div className="p4-ex-grid">
                {hrSamples.slice(0, 8).map((s, i) => (
                  <div key={s.id} className="p4-ex-cell">
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <span className="p4-ex-num">{i + 1}</span>
                      <span className="p4-ex-name">Sample {i + 1}</span>
                    </div>
                    <div className="p4-ex-meta">{new Date(s.sampled_at).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false })}</div>
                    <div className="p4-ex-hr" style={{ color:zoneColor(s.bpm) }}>
                      {s.bpm}<span className="p4-ex-hr-unit">bpm</span>
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

          {/* Actions */}
          <div className="btn-row" style={{ gap:8 }}>
            <button className="btn-ghost" style={{ flex:1, fontSize:12, padding:'10px 8px' }}>Share Log</button>
            <button className="btn-primary" style={{ flex:2, fontSize:13 }} onClick={() => navigate('/map')}>Back to Home</button>
          </div>

        </div>
      </div>
    </>
  )
}
