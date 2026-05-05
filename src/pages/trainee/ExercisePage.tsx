import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav'
import { exercises, type Exercise } from '../../data/exercises'

const MUSCLES = ['all','chest','back','shoulders','legs','arms','core'] as const
const EQUIPS  = ['all','free_weight','cable','machine'] as const

function ChipRow<T extends string>({ options, active, onSelect, label }: {
  options: readonly T[], active: T, onSelect: (v: T) => void, label: (v: T) => string
}) {
  return (
    <div className="filter-group">
      {options.map(o => (
        <button
          key={o}
          className={`filter-chip${active === o ? ' active' : ''}`}
          onClick={() => onSelect(o)}
        >
          {label(o)}
        </button>
      ))}
    </div>
  )
}

export default function ExercisePage() {
  const [search, setSearch]   = useState('')
  const [muscle, setMuscle]   = useState<typeof MUSCLES[number]>('all')
  const [equip, setEquip]     = useState<typeof EQUIPS[number]>('all')
  const [selected, setSelected] = useState<Exercise>(exercises[0])
  const navigate = useNavigate()

  const filtered = exercises.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchMuscle = muscle === 'all' || ex.muscle === muscle
    const matchEquip  = equip  === 'all' || ex.equipment === equip
    return matchSearch && matchMuscle && matchEquip
  })

  const equipLabel = (e: string) => ({ all:'All', free_weight:'Free Weight', cable:'Cable', machine:'Machine' }[e] ?? e)
  const muscleLabel = (m: string) => m === 'all' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1)

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position:'relative', zIndex:1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate('/map')}>← Back</button>
          <span className="hbar-ttl">Exercises</span>
          <span />
        </div>

        <div className="content">
          <input
            className="search-input"
            placeholder="🔍  Search exercises…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="card" style={{ padding:11 }}>
            <div className="label-sm" style={{ marginBottom:5 }}>Muscle Group</div>
            <ChipRow options={MUSCLES} active={muscle} onSelect={setMuscle} label={muscleLabel} />
            <div className="label-sm" style={{ marginTop:9, marginBottom:5 }}>Equipment</div>
            <ChipRow options={EQUIPS}  active={equip}  onSelect={setEquip}  label={equipLabel} />
          </div>

          {/* Exercise grid */}
          <div className="exercise-grid">
            {filtered.map(ex => (
              <button
                key={ex.id}
                onClick={() => setSelected(ex)}
                className={`exercise-card${selected.id === ex.id ? ' active' : ''}`}
              >
                <div className="exercise-visual">
                  <div className="visual-fallback">{ex.icon}<br />{ex.name}</div>
                </div>
                <div className="exercise-copy">
                  <h4>{ex.name}</h4>
                  <p>{ex.muscle} · {equipLabel(ex.equipment)}</p>
                  <div className="exercise-tags">
                    <span>{ex.level}</span>
                    <span>{ex.sets} sets</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="card" style={{ padding:12 }}>
            <div className="detail-preview">
              <div className="detail-visual">
                <span style={{ fontSize:36 }}>{selected.icon}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <span className="tag tag-coach fs10">{selected.level}</span>
                <div style={{ fontSize:14, fontWeight:700, margin:'5px 0 2px' }}>{selected.name}</div>
                <div className="fs11 t-m">{selected.muscle} · {equipLabel(selected.equipment)} · {selected.sets}×{selected.reps}</div>
              </div>
            </div>
            <div className="detail-block">
              <h4 style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Instructions</h4>
              <div className="fs11 t-m" style={{ lineHeight:1.55 }}>{selected.how}</div>
            </div>
            <div className="detail-block">
              <h4 style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Programming</h4>
              <div className="fs11 t-m">{selected.breath}</div>
            </div>
            <button
              className="btn-primary"
              style={{ marginTop:8 }}
              onClick={() => navigate('/train', { state: { exercise: selected } })}
            >
              ▶ Start Training
            </button>
          </div>
        </div>

        <BottomNav />
      </div>
    </>
  )
}
