import { useTheme } from '../hooks/useTheme'

export interface ZoneCount { current: number; capacity: number }

interface Props {
  zoneCounts?: Record<string, ZoneCount>
  activeZone?: string | null
  onZoneClick?: (zone: string) => void
}

const VW = 400
const VH = 240

// Equipment drawn matches capacity: cardio 6, free_weight 1 barbell+5 dumbbells=6, machine 6, stretching 4
const TREADMILL_X = [21, 84, 147, 210, 273, 336]
const BIKE_X      = [14, 77, 140, 203, 266, 329]
const MACHINE_X   = [214, 245, 276, 307, 338, 369]
const MAT_X       = [30, 115, 200, 285, 360]
const DUMBBELLS: [number, number][] = [
  [113, 92], [140, 92], [167, 92],
  [113, 110], [140, 110], [167, 110],
  [127, 128], [154, 128],
]

const ZONE_DEFS = [
  { id: 'cardio',      x: 2,   y: 2,   w: 396, h: 76  },
  { id: 'free_weight', x: 2,   y: 82,  w: 193, h: 75  },
  { id: 'machine',     x: 205, y: 82,  w: 193, h: 75  },
  { id: 'stretching',  x: 2,   y: 161, w: 396, h: 77  },
]

function CountBadge({ zone, counts, c, zoneIdx }: {
  zone: typeof ZONE_DEFS[0]
  counts?: ZoneCount
  c: ReturnType<typeof makeColors>
  zoneIdx: number
}) {
  if (!counts) return null
  const full = counts.current >= counts.capacity
  const cx = zone.x + zone.w / 2
  const cy = zone.y + zone.h / 2
  const bw = 78, bh = 32
  const labelColor = c.labels[zoneIdx]
  return (
    <>
      <rect
        x={cx - bw / 2} y={cy - bh / 2}
        width={bw} height={bh} rx={9}
        fill={full ? c.badgeBgFull : c.badgeBgNormal}
        stroke={full ? c.badgeBorderFull : c.badgeBorderNormal}
        strokeWidth={1.5}
      />
      <text
        x={cx} y={cy + 6}
        textAnchor="middle"
        fill={full ? c.badgeTextFull : (c.badgeTextNormal ?? labelColor)}
        fontSize={17} fontWeight="900"
        style={{ pointerEvents: 'none' }}
      >
        {counts.current}/{counts.capacity}
      </text>
    </>
  )
}

function makeColors(light: boolean) {
  if (light) return {
    bg:              '#f4f1ec',
    zoneFills:       ['rgba(29,200,187,0.10)', 'rgba(245,158,11,0.10)', 'rgba(168,85,247,0.10)', 'rgba(34,197,94,0.10)'],
    zoneFillActive:  'rgba(59,130,246,0.12)',
    zoneStrokes:     ['rgba(29,200,187,0.45)', 'rgba(245,158,11,0.45)', 'rgba(168,85,247,0.45)', 'rgba(34,197,94,0.45)'],
    zoneStrokeActive:'#3b82f6',
    wall:            '#6b6560',
    equipFill:       '#e5e0d8',
    equipStroke:     '#a09890',
    equipStrokeInner:'#c0b8b0',
    labels:          ['#0a8a7e', '#b06800', '#7c3aed', '#15803d'],
    badgeBgNormal:   'rgba(59,130,246,0.13)',
    badgeBorderNormal:'rgba(59,130,246,0.55)',
    badgeTextNormal: '#1d4ed8',
    badgeBgFull:     'rgba(239,68,68,0.13)',
    badgeBorderFull: 'rgba(239,68,68,0.55)',
    badgeTextFull:   '#dc2626',
  }
  return {
    bg:              '#09131e',
    zoneFills:       ['rgba(29,200,187,0.10)', 'rgba(245,158,11,0.09)', 'rgba(168,85,247,0.09)', 'rgba(34,197,94,0.08)'],
    zoneFillActive:  'rgba(58,130,246,0.12)',
    zoneStrokes:     ['rgba(29,200,187,0.40)', 'rgba(245,158,11,0.40)', 'rgba(168,85,247,0.40)', 'rgba(34,197,94,0.35)'],
    zoneStrokeActive:'#3b82f6',
    wall:            '#1e3d5e',
    equipFill:       '#102843',
    equipStroke:     '#1e4565',
    equipStrokeInner:'#1e4060',
    labels:          ['#2dd4c0', '#f59e0b', '#c084fc', '#4ade80'],
    badgeBgNormal:   'rgba(29,100,160,0.35)',
    badgeBorderNormal:'rgba(45,96,144,0.70)',
    badgeTextNormal: '#7dcfef',
    badgeBgFull:     'rgba(239,68,68,0.22)',
    badgeBorderFull: 'rgba(239,68,68,0.60)',
    badgeTextFull:   '#f87171',
  }
}

export function GymFloorPlan({ zoneCounts, activeZone, onZoneClick }: Props) {
  const { theme } = useTheme()
  const c = makeColors(theme === 'light')

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block' }}>
      {/* Background */}
      <rect width={VW} height={VH} fill={c.bg} rx={8} />

      {/* Zone fills + click areas */}
      {ZONE_DEFS.map((z, zi) => {
        const isActive = activeZone === z.id
        return (
          <g key={z.id} onClick={() => onZoneClick?.(z.id)} style={{ cursor: onZoneClick ? 'pointer' : 'default' }}>
            <rect
              x={z.x} y={z.y} width={z.w} height={z.h} rx={5}
              fill={isActive ? c.zoneFillActive : c.zoneFills[zi]}
              stroke={isActive ? c.zoneStrokeActive : c.zoneStrokes[zi]}
              strokeWidth={isActive ? 2 : 1}
            />
          </g>
        )
      })}

      {/* Outer walls */}
      <rect x={1} y={1} width={398} height={238} rx={6} fill="none" stroke={c.wall} strokeWidth={1.5} />

      {/* Cardio: treadmills (top row) + bikes (second row) */}
      <g opacity={0.42} style={{ pointerEvents: 'none' }}>
        {TREADMILL_X.map(x => (
          <g key={`t${x}`}>
            <rect x={x + 14} y={5}  width={16} height={16} rx={2} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <rect x={x + 17} y={8}  width={10} height={9}  rx={1} fill={c.bg}        stroke={c.equipStrokeInner} strokeWidth={0.5} />
            <rect x={x}      y={19} width={44} height={22} rx={3} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <line x1={x + 8} y1={26} x2={x + 36} y2={26} stroke={c.equipStrokeInner} strokeWidth={0.6} />
            <line x1={x + 8} y1={33} x2={x + 36} y2={33} stroke={c.equipStrokeInner} strokeWidth={0.6} />
          </g>
        ))}
        {/* Spin bikes — second row */}
        {BIKE_X.map(x => (
          <g key={`b${x}`}>
            <ellipse cx={x + 22} cy={57} rx={10} ry={5} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <rect x={x + 16} y={50} width={12} height={4} rx={2} fill={c.equipFill} stroke={c.equipStrokeInner} strokeWidth={0.7} />
            <line x1={x + 8}  y1={61} x2={x + 36} y2={61} stroke={c.equipStroke} strokeWidth={1.5} strokeLinecap="round" />
            <ellipse cx={x + 11} cy={63} rx={4} ry={4} fill="none" stroke={c.equipStroke} strokeWidth={1} />
            <ellipse cx={x + 33} cy={63} rx={4} ry={4} fill="none" stroke={c.equipStroke} strokeWidth={1} />
          </g>
        ))}
      </g>

      <text x={200} y={68} textAnchor="middle" fill={c.labels[0]} fontSize={10} fontWeight="800" letterSpacing="1.5" style={{ pointerEvents:'none' }}>CARDIO · Treadmills · Bikes</text>
      <CountBadge zone={ZONE_DEFS[0]} counts={zoneCounts?.['cardio']} c={c} zoneIdx={0} />

      {/* Free Weights: 1 barbell + 4 dumbbells = 5 */}
      <g opacity={0.38} style={{ pointerEvents: 'none' }}>
        <circle cx={28} cy={108} r={11} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1.5} />
        <rect   x={39}  y={105}  width={58} height={6} rx={3} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
        <circle cx={97} cy={108} r={11} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1.5} />
        <rect x={26} y={116} width={6} height={22} rx={2} fill={c.equipFill} stroke={c.equipStrokeInner} strokeWidth={0.8} />
        <rect x={90} y={116} width={6} height={22} rx={2} fill={c.equipFill} stroke={c.equipStrokeInner} strokeWidth={0.8} />
        {DUMBBELLS.map(([dx, dy]) => (
          <g key={`d${dx}${dy}`}>
            <circle cx={dx}      cy={dy} r={6} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <rect   x={dx + 6}   y={dy - 2.5} width={10} height={5} rx={2.5} fill={c.equipFill} stroke={c.equipStrokeInner} strokeWidth={0.6} />
            <circle cx={dx + 16} cy={dy} r={6} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
          </g>
        ))}
      </g>
      <text x={98} y={152} textAnchor="middle" fill={c.labels[1]} fontSize={9} fontWeight="800" letterSpacing="1.5" style={{ pointerEvents:'none' }}>FREE WEIGHTS</text>
      <CountBadge zone={ZONE_DEFS[1]} counts={zoneCounts?.['free_weight']} c={c} zoneIdx={1} />

      {/* Machines: 3 */}
      <g opacity={0.38} style={{ pointerEvents: 'none' }}>
        {MACHINE_X.map(x => (
          <g key={`m${x}`}>
            <rect x={x}     y={88}  width={22} height={52} rx={3} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <rect x={x + 4} y={93}  width={14} height={18} rx={2} fill={c.bg} stroke={c.equipStrokeInner} strokeWidth={0.6} />
            <rect x={x + 6} y={114} width={10} height={8}  rx={2} fill={c.equipFill} stroke={c.equipStrokeInner} strokeWidth={0.5} />
          </g>
        ))}
      </g>
      <text x={302} y={152} textAnchor="middle" fill={c.labels[2]} fontSize={9} fontWeight="800" letterSpacing="1.5" style={{ pointerEvents:'none' }}>MACHINES</text>
      <CountBadge zone={ZONE_DEFS[2]} counts={zoneCounts?.['machine']} c={c} zoneIdx={2} />

      {/* Stretching: 5 mats */}
      <g opacity={0.42} style={{ pointerEvents: 'none' }}>
        {MAT_X.map(x => (
          <g key={`mat${x}`}>
            <rect x={x} y={172} width={26} height={42} rx={8} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <line x1={x + 4} y1={185} x2={x + 22} y2={185} stroke={c.equipStrokeInner} strokeWidth={0.5} />
            <line x1={x + 4} y1={195} x2={x + 22} y2={195} stroke={c.equipStrokeInner} strokeWidth={0.5} />
          </g>
        ))}
      </g>
      <text x={200} y={233} textAnchor="middle" fill={c.labels[3]} fontSize={9} fontWeight="800" letterSpacing="1.5" style={{ pointerEvents:'none' }}>STRETCHING · Yoga · Foam Rolling · Mobility</text>
      <CountBadge zone={ZONE_DEFS[3]} counts={zoneCounts?.['stretching']} c={c} zoneIdx={3} />
    </svg>
  )
}
