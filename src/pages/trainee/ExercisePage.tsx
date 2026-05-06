import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav'

interface EquipEntry {
  id: string
  name: string
  category: string
  path: string
  ex_paths: Record<string, string | null>
  ex_gif_paths: Record<string, string | null>
}
interface MuscleEntry {
  id: string
  name: string
  target_group: string
  path: string
}
interface ExEntry {
  id: string
  name: string
  equipment_ids: string[]
  primary_muscle_ids: string[]
  mechanics: string
  instructions: string
  programming: {
    beginner: { sets: string; reps: string; rpe: string }
    advanced:  { sets: string; reps: string; rpe: string }
  }
}

interface ExerciseData {
  exercises: ExEntry[]
  equipment: EquipEntry[]
  muscles: MuscleEntry[]
}

const EXERCISE_DATA_URL = '/assets/exercise-data.json'

function getGif(ex: ExEntry, equipMap: Map<string, EquipEntry>): string | null {
  for (const eqId of ex.equipment_ids) {
    const gif = equipMap.get(eqId)?.ex_gif_paths[ex.id]
    if (gif) return gif
  }
  return null
}
function getImg(ex: ExEntry, equipMap: Map<string, EquipEntry>): string | null {
  for (const eqId of ex.equipment_ids) {
    const img = equipMap.get(eqId)?.ex_paths[ex.id]
    if (img) return img
  }
  return null
}
function getPrimaryMuscle(ex: ExEntry, muscleMap: Map<string, MuscleEntry>): MuscleEntry | null {
  return muscleMap.get(ex.primary_muscle_ids[0]) ?? null
}
function getEquipCategory(ex: ExEntry, equipMap: Map<string, EquipEntry>): string {
  return equipMap.get(ex.equipment_ids[0])?.category ?? 'unknown'
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const MUSCLE_GROUPS = ['all', 'chest', 'back', 'shoulders', 'legs_glutes', 'arms', 'core'] as const
const EQUIP_CATS    = ['all', 'free_weight', 'cable', 'machine'] as const

const MUSCLE_LABEL: Record<string, string> = {
  all: 'All', chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
  legs_glutes: 'Legs', arms: 'Arms', core: 'Core',
}
const EQUIP_LABEL: Record<string, string> = {
  all: 'All', free_weight: 'Free Weight', cable: 'Cable', machine: 'Machine',
}

function ChipRow<T extends string>({ options, active, onSelect, label }: {
  options: readonly T[]; active: T; onSelect: (v: T) => void; label: (v: T) => string
}) {
  return (
    <div className="filter-group">
      {options.map(o => (
        <button key={o} className={`filter-chip${active === o ? ' active' : ''}`} onClick={() => onSelect(o)}>
          {label(o)}
        </button>
      ))}
    </div>
  )
}

function ProgramCard({ label, p }: { label: string; p: { sets: string; reps: string; rpe: string } }) {
  return (
    <div className="card" style={{ flex: 1, padding: '8px 10px' }}>
      <div className="fs10 fw6" style={{ marginBottom: 4, color: 'var(--mu2)' }}>{label}</div>
      <div className="fs11 fw6">{p.sets} sets</div>
      <div className="fs10 t-m">{p.reps} reps · RPE {p.rpe}</div>
    </div>
  )
}

export default function ExercisePage() {
  const [search, setSearch]     = useState('')
  const [muscle, setMuscle]     = useState<typeof MUSCLE_GROUPS[number]>('all')
  const [equip, setEquip]       = useState<typeof EQUIP_CATS[number]>('all')
  const [data, setData]         = useState<ExerciseData | null>(null)
  const [selected, setSelected] = useState<ExEntry | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(EXERCISE_DATA_URL)
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<ExerciseData>
      })
      .then(nextData => {
        setData(nextData)
        setSelected(current => current ?? nextData.exercises[0] ?? null)
      })
      .catch(error => {
        console.error('load exercise data:', error)
        setLoadError('Could not load exercise data')
      })
  }, [])

  const equipMap = useMemo(
    () => new Map<string, EquipEntry>((data?.equipment ?? []).map(e => [e.id, e])),
    [data]
  )
  const muscleMap = useMemo(
    () => new Map<string, MuscleEntry>((data?.muscles ?? []).map(m => [m.id, m])),
    [data]
  )

  const filtered = useMemo(() => (data?.exercises ?? []).filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchMuscle = muscle === 'all' ||
      ex.primary_muscle_ids.some(mid => muscleMap.get(mid)?.target_group === muscle)
    const matchEquip  = equip === 'all' ||
      ex.equipment_ids.some(eid => equipMap.get(eid)?.category === equip)
    return matchSearch && matchMuscle && matchEquip
  }), [data, search, muscle, equip, muscleMap, equipMap])

  const selGif    = selected ? getGif(selected, equipMap) : null
  const selImg    = selected ? getImg(selected, equipMap) : null
  const selHero   = selGif ?? selImg
  const selMuscle = selected ? getPrimaryMuscle(selected, muscleMap) : null

  if (loadError || !data || !selected) {
    return (
      <>
        <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
        <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hbar">
            <button className="hbar-back" onClick={() => navigate(-1)}>← Back</button>
            <span className="hbar-ttl">Exercises</span>
            <span />
          </div>
          <div className="content">
            <div className="card" style={{ padding: 14, color: loadError ? 'var(--z-red)' : 'var(--mu)' }}>
              {loadError ?? 'Loading exercises...'}
            </div>
          </div>
          <BottomNav />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={{ position: 'relative', zIndex: 1 }}>
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate(-1)}>← Back</button>
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

          <div className="card" style={{ padding: 11 }}>
            <div className="label-sm" style={{ marginBottom: 5 }}>Muscle Group</div>
            <ChipRow options={MUSCLE_GROUPS} active={muscle} onSelect={setMuscle} label={v => MUSCLE_LABEL[v] ?? v} />
            <div className="label-sm" style={{ marginTop: 9, marginBottom: 5 }}>Equipment</div>
            <ChipRow options={EQUIP_CATS} active={equip} onSelect={setEquip} label={v => EQUIP_LABEL[v] ?? v} />
          </div>

          {/* Exercise grid */}
          <div className="exercise-grid">
            {filtered.map(ex => {
              const thumb = getGif(ex, equipMap) ?? getImg(ex, equipMap)
              const muscleGroup = muscleMap.get(ex.primary_muscle_ids[0])?.target_group ?? ''
              return (
                <button
                  key={ex.id}
                  onClick={() => setSelected(ex)}
                  className={`exercise-card${selected.id === ex.id ? ' active' : ''}`}
                >
                  <div className="exercise-visual">
                    {thumb
                      ? <img src={thumb} alt={ex.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                      : <div className="visual-fallback">{ex.name}</div>
                    }
                  </div>
                  <div className="exercise-copy">
                    <h4>{ex.name}</h4>
                    <p>{MUSCLE_LABEL[muscleGroup] ?? muscleGroup} · {EQUIP_LABEL[getEquipCategory(ex, equipMap)] ?? ''}</p>
                    <div className="exercise-tags">
                      <span>{capitalize(ex.mechanics)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Detail panel */}
          <div className="card" style={{ padding: 12 }}>
            {selHero && (
              <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 10, height: 190 }}>
                <img src={selHero} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div className="detail-preview">
              {selMuscle && (
                <img
                  src={selMuscle.path}
                  alt={selMuscle.name}
                  style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="tag tag-coach fs10">{capitalize(selected.mechanics)}</span>
                <div style={{ fontSize: 14, fontWeight: 700, margin: '5px 0 2px' }}>{selected.name}</div>
                <div className="fs11 t-m">
                  {selMuscle?.name ?? ''} · {EQUIP_LABEL[getEquipCategory(selected, equipMap)] ?? ''}
                </div>
              </div>
            </div>

            <div className="detail-block">
              <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Instructions</h4>
              <div className="fs11 t-m" style={{ lineHeight: 1.55 }}>{selected.instructions}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <ProgramCard label="Beginner" p={selected.programming.beginner} />
              <ProgramCard label="Advanced" p={selected.programming.advanced} />
            </div>

            <button
              className="btn-primary"
              style={{ marginTop: 10 }}
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
