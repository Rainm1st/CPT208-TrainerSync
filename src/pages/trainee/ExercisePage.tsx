import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../../components/BottomNav'
import { useTheme } from '../../hooks/useTheme'

const BASE = import.meta.env.BASE_URL
function assetUrl(path: string): string {
  return BASE + path.replace(/^\//, '')
}

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

const EXERCISE_DATA_URL = assetUrl('assets/exercise-data.json')

function getGif(ex: ExEntry, equipMap: Map<string, EquipEntry>): string | null {
  for (const eqId of ex.equipment_ids) {
    const gif = equipMap.get(eqId)?.ex_gif_paths[ex.id]
    if (gif) return assetUrl(gif)
  }
  return null
}
function getImg(ex: ExEntry, equipMap: Map<string, EquipEntry>): string | null {
  for (const eqId of ex.equipment_ids) {
    const img = equipMap.get(eqId)?.ex_paths[ex.id]
    if (img) return assetUrl(img)
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
  all: 'All', free_weight: 'Free', cable: 'Cable', machine: 'Machine',
}

export default function ExercisePage() {
  const { theme, toggle } = useTheme()
  const [search, setSearch]       = useState('')
  const [muscle, setMuscle]       = useState<typeof MUSCLE_GROUPS[number]>('all')
  const [equip, setEquip]         = useState<typeof EQUIP_CATS[number]>('all')
  const [data, setData]           = useState<ExerciseData | null>(null)
  const [selected, setSelected]   = useState<ExEntry | null>(null)
  const [queue, setQueue]         = useState<ExEntry[]>([])
  const [demoUrlMap, setDemoUrlMap] = useState<Record<string, string>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(EXERCISE_DATA_URL)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ExerciseData>
      })
      .then(d => {
        setData(d)
        setSelected(cur => cur ?? d.exercises[0] ?? null)
      })
      .catch(err => {
        console.error('load exercise data:', err)
        setLoadError('Could not load exercise data')
      })
  }, [])

  const equipMap  = useMemo(() => new Map<string, EquipEntry>((data?.equipment ?? []).map(e => [e.id, e])), [data])
  const muscleMap = useMemo(() => new Map<string, MuscleEntry>((data?.muscles ?? []).map(m => [m.id, m])), [data])

  const filtered = useMemo(() => (data?.exercises ?? []).filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase())
    const matchMuscle = muscle === 'all' || ex.primary_muscle_ids.some(mid => muscleMap.get(mid)?.target_group === muscle)
    const matchEquip  = equip  === 'all' || ex.equipment_ids.some(eid => equipMap.get(eid)?.category === equip)
    return matchSearch && matchMuscle && matchEquip
  }), [data, search, muscle, equip, muscleMap, equipMap])

  const selGif    = selected ? getGif(selected, equipMap)          : null
  const selImg    = selected ? getImg(selected, equipMap)          : null
  const selHero   = selGif ?? selImg
  const selMuscle = selected ? getPrimaryMuscle(selected, muscleMap) : null

  const shellStyle: React.CSSProperties = {
    position: 'relative', zIndex: 1, height: '100vh', overflow: 'hidden',
  }

  if (loadError || !data || !selected) {
    return (
      <>
        <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
        <div className="app-shell" style={shellStyle}>
          <div className="hbar">
            <button className="hbar-back" onClick={() => navigate(-1)}>← Back</button>
            <span className="hbar-ttl">Exercises</span>
            <button className="theme-toggle-btn" style={{ width:28, height:28, fontSize:13 }} onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: loadError ? 'var(--z-red)' : 'var(--mu)', fontSize: 13 }}>
              {loadError ?? 'Loading exercises…'}
            </span>
          </div>
          <BottomNav />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="amb amb-1" /><div className="amb amb-2" /><div className="amb amb-3" />
      <div className="app-shell" style={shellStyle}>

        {/* ── Header ── */}
        <div className="hbar">
          <button className="hbar-back" onClick={() => navigate(-1)}>← Back</button>
          <span className="hbar-ttl">Exercises</span>
          <span />
        </div>

        {/* ── Filters — fixed ── */}
        <div style={{ flexShrink: 0, padding: '8px 13px 7px', borderBottom: '1px solid var(--bd)', background: 'var(--s0)' }}>
          {/* Search */}
          <input
            className="search-input"
            placeholder="🔍  Search exercises…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 7, padding: '7px 11px', fontSize: 12 }}
          />

          {/* Muscle chips — scrollable row */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 5 }}>
            {MUSCLE_GROUPS.map(o => (
              <button
                key={o}
                onClick={() => setMuscle(o)}
                style={{
                  flexShrink: 0, padding: '3px 9px', borderRadius: 99,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${muscle === o ? 'var(--brand)' : 'var(--bd2)'}`,
                  background: muscle === o ? 'var(--brand-t)' : 'transparent',
                  color: muscle === o ? 'var(--brand)' : 'var(--mu)',
                  minHeight: 0, minWidth: 0,
                }}
              >
                {MUSCLE_LABEL[o]}
              </button>
            ))}
          </div>

          {/* Equipment chips */}
          <div style={{ display: 'flex', gap: 4 }}>
            {EQUIP_CATS.map(o => (
              <button
                key={o}
                onClick={() => setEquip(o)}
                style={{
                  flexShrink: 0, padding: '3px 9px', borderRadius: 99,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${equip === o ? 'var(--amber)' : 'var(--bd2)'}`,
                  background: equip === o ? 'var(--amber-t)' : 'transparent',
                  color: equip === o ? 'var(--amber)' : 'var(--mu)',
                  minHeight: 0, minWidth: 0,
                }}
              >
                {EQUIP_LABEL[o]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Exercise grid — only scrollable zone ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 13px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--mu)', fontSize: 12, paddingTop: 24 }}>
              No exercises match — try different filters
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {filtered.map(ex => {
                const thumb         = getGif(ex, equipMap) ?? getImg(ex, equipMap)
                const muscleGroup   = muscleMap.get(ex.primary_muscle_ids[0])?.target_group ?? ''
                const equipCategory = getEquipCategory(ex, equipMap)
                const isActive      = selected.id === ex.id
                const queueIdx      = queue.findIndex(q => q.id === ex.id)
                const inQueue       = queueIdx !== -1
                const queueNum      = queueIdx + 1
                return (
                  <button
                    key={ex.id}
                    onClick={() => {
                      setSelected(ex)
                      const url = getGif(ex, equipMap) ?? getImg(ex, equipMap)
                      if (inQueue) {
                        setQueue(q => q.filter(q => q.id !== ex.id))
                        setDemoUrlMap(m => { const n = { ...m }; delete n[ex.id]; return n })
                      } else {
                        setQueue(q => [...q, ex])
                        if (url) setDemoUrlMap(m => ({ ...m, [ex.id]: url }))
                      }
                    }}
                    style={{
                      position: 'relative',
                      background: inQueue ? 'var(--s2)' : isActive ? 'var(--s2)' : 'var(--s1)',
                      border: `1.5px solid ${inQueue ? 'var(--lime)' : isActive ? 'var(--bd2)' : 'var(--bd)'}`,
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--tx)',
                      padding: 0,
                      minHeight: 0, minWidth: 0,
                    }}
                  >
                    {/* Queue number badge */}
                    {inQueue && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4, zIndex: 2,
                        width: 16, height: 16, borderRadius: '50%',
                        background: 'var(--lime)', color: '#000',
                        fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}>
                        {queueNum}
                      </div>
                    )}
                    {/* Thumbnail */}
                    <div style={{ height: 78, background: 'linear-gradient(145deg,var(--brand-t),var(--teal-t))', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                      {thumb
                        ? <img src={thumb} alt={ex.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 9, fontWeight: 700, padding: '0 5px', textAlign: 'center', color: 'var(--mu)', lineHeight: 1.3 }}>{ex.name}</span>
                      }
                    </div>
                    {/* Name + muscle · equip */}
                    <div style={{ padding: '5px 7px 6px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: inQueue ? 'var(--lime)' : isActive ? 'var(--tx)' : 'var(--tx)', marginBottom: 2 }}>
                        {ex.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--mu)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {MUSCLE_LABEL[muscleGroup] ?? muscleGroup} · {EQUIP_LABEL[equipCategory] ?? equipCategory}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Selected exercise spec — fixed bottom panel ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--bd)', background: 'var(--s0)', padding: '10px 13px' }}>
          <div style={{ display: 'flex', gap: 11, alignItems: 'stretch' }}>

            {/* Left: title / subtitle / instructions / programs */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--mu)' }}>
                {selMuscle?.name ?? ''}{selMuscle ? ' · ' : ''}{EQUIP_LABEL[getEquipCategory(selected, equipMap)] ?? ''} · {capitalize(selected.mechanics)}
              </div>
              <div className="clamp-3" style={{ fontSize: 10, color: 'var(--mu)', lineHeight: 1.5, marginTop: 1 }}>
                {selected.instructions}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 'auto', paddingTop: 5 }}>
                {(['beginner', 'advanced'] as const).map(lvl => (
                  <div key={lvl} style={{ flex: 1, background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 7, padding: '4px 7px' }}>
                    <div style={{ fontSize: 9, color: 'var(--mu2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{lvl}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
                      {selected.programming[lvl].sets}
                      <span style={{ fontWeight: 400, color: 'var(--mu)', fontSize: 11 }}>×</span>
                      {selected.programming[lvl].reps}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--mu)', marginTop: 2 }}>RPE {selected.programming[lvl].rpe}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: image on top, Start button on bottom */}
            <div style={{ flexShrink: 0, width: 108, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ flex: 1, borderRadius: 9, overflow: 'hidden', background: 'linear-gradient(145deg,var(--brand-t),var(--teal-t))', display: 'grid', placeItems: 'center', minHeight: 80 }}>
                {selHero
                  ? <img src={selHero} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 28 }}>🏋️</span>
                }
              </div>
              <button
                className="btn-primary"
                style={{ padding: '10px 0', fontSize: 12, letterSpacing: '.05em' }}
                onClick={() => {
                  const finalQueue = queue.length > 0 ? queue : [selected]
                  const finalUrls  = queue.length > 0 ? demoUrlMap : (selGif ?? selImg ? { [selected.id]: selGif ?? selImg! } : {})
                  navigate('/train', { state: { exercises: finalQueue, demoUrls: finalUrls } })
                }}
              >
                {queue.length > 1 ? `▶ Start (${queue.length})` : '▶ Start'}
              </button>
            </div>

          </div>
        </div>

        <BottomNav />
      </div>
    </>
  )
}
