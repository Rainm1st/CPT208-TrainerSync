import { supabase } from './supabase'

type HrPoint = { bpm: number; offset_s: number }

function hrCurve(duration_s: number): HrPoint[] {
  // Realistic HR curve: warmup → target → peak → cooldown, sampled every 2s
  const pts: HrPoint[] = []
  for (let t = 0; t <= duration_s; t += 2) {
    const pct = t / duration_s
    let base: number
    if (pct < 0.15)       base = 90 + pct / 0.15 * 35          // warmup 90→125
    else if (pct < 0.55)  base = 125 + (pct - 0.15) / 0.4 * 25 // build 125→150
    else if (pct < 0.75)  base = 150 + (pct - 0.55) / 0.2 * 18 // peak 150→168
    else                  base = 168 - (pct - 0.75) / 0.25 * 55 // cooldown 168→113
    const noise = (Math.random() - 0.5) * 10
    pts.push({ bpm: Math.round(Math.max(88, Math.min(178, base + noise))), offset_s: t })
  }
  return pts
}

const DEMO_SESSIONS = [
  { exercise_name:'Bench Press',      exercise_id:'bench_press',      duration_s:2400, sets_done:5, daysAgo:1  },
  { exercise_name:'Squat',            exercise_id:'squat',            duration_s:2700, sets_done:6, daysAgo:2  },
  { exercise_name:'Lat Pulldown',     exercise_id:'lat_pulldown',     duration_s:1800, sets_done:4, daysAgo:3  },
  { exercise_name:'Deadlift',         exercise_id:'deadlift',         duration_s:3000, sets_done:5, daysAgo:5  },
  { exercise_name:'Overhead Press',   exercise_id:'overhead_press',   duration_s:1980, sets_done:4, daysAgo:7  },
  { exercise_name:'Barbell Row',      exercise_id:'barbell_row',      duration_s:2100, sets_done:5, daysAgo:9  },
  { exercise_name:'Incline Bench',    exercise_id:'incline_bench',    duration_s:2280, sets_done:4, daysAgo:11 },
  { exercise_name:'Romanian Deadlift',exercise_id:'romanian_deadlift',duration_s:2460, sets_done:4, daysAgo:13 },
]

export async function seedDemoSessions(traineeId: string): Promise<string> {
  let inserted = 0

  for (const def of DEMO_SESSIONS) {
    const startedAt = new Date(Date.now() - def.daysAgo * 86400_000)
    const endedAt   = new Date(startedAt.getTime() + def.duration_s * 1000)
    const hrPts     = hrCurve(def.duration_s)
    const bpms      = hrPts.map(p => p.bpm)
    const avg_hr    = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length)
    const max_hr    = Math.max(...bpms)

    const { data: sess, error: sessErr } = await supabase
      .from('sessions')
      .insert({
        trainee_id:    traineeId,
        exercise_name: def.exercise_name,
        exercise_id:   def.exercise_id,
        started_at:    startedAt.toISOString(),
        ended_at:      endedAt.toISOString(),
        duration_s:    def.duration_s,
        avg_hr,
        max_hr,
        sets_done:     def.sets_done,
      })
      .select('id')
      .single()

    if (sessErr || !sess) { console.error('seed session:', sessErr); continue }

    const hrRows = hrPts.map(p => ({
      session_id: sess.id,
      bpm:        p.bpm,
      sampled_at: new Date(startedAt.getTime() + p.offset_s * 1000).toISOString(),
    }))

    const { error: hrErr } = await supabase.from('hr_samples').insert(hrRows)
    if (hrErr) console.error('seed hr_samples:', hrErr)
    else inserted++
  }

  return `Seeded ${inserted}/${DEMO_SESSIONS.length} demo sessions.`
}
