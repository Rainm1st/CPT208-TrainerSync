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
const MACHINE_X   = [214, 245, 276, 307, 338, 369]
const MAT_X       = [57, 142, 227, 312]
const DUMBBELLS: [number, number][] = [
  [113, 97], [140, 97], [167, 97],
  [127, 121], [154, 121],
]

const ZONE_DEFS = [
  { id: 'cardio',      x: 2,   y: 2,   w: 396, h: 76  },
  { id: 'free_weight', x: 2,   y: 82,  w: 193, h: 75  },
  { id: 'machine',     x: 205, y: 82,  w: 193, h: 75  },
  { id: 'stretching',  x: 2,   y: 161, w: 396, h: 77  },
]

function CountBadge({ zone, counts, c }: {
  zone: typeof ZONE_DEFS[0]
  counts?: ZoneCount
  c: ReturnType<typeof makeColors>
}) {
  if (!counts) return null
  const full = counts.current >= counts.capacity
  const cx = zone.x + zone.w / 2
  const cy = zone.y + zone.h / 2
  const bw = 78, bh = 32
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
        fill={full ? c.badgeTextFull : c.badgeTextNormal}
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
    zoneFill:        'rgba(0,0,0,0.025)',
    zoneFillAlt:     'rgba(0,0,0,0.018)',
    zoneFillActive:  'rgba(59,130,246,0.07)',
    zoneStroke:      '#b0a99e',
    zoneStrokeActive:'#3b82f6',
    wall:            '#6b6560',
    equipFill:       '#e5e0d8',
    equipStroke:     '#a09890',
    equipStrokeInner:'#c0b8b0',
    label:           '#5a5450',
    sublabel:        '#a09890',
    entrance:        '#c0b8b0',
    badgeBgNormal:   'rgba(59,130,246,0.13)',
    badgeBorderNormal:'rgba(59,130,246,0.55)',
    badgeTextNormal: '#1d4ed8',
    badgeBgFull:     'rgba(239,68,68,0.13)',
    badgeBorderFull: 'rgba(239,68,68,0.55)',
    badgeTextFull:   '#dc2626',
  }
  return {
    bg:              '#09131e',
    zoneFill:        '#0c1c2f',
    zoneFillAlt:     '#0b1b2d',
    zoneFillActive:  'rgba(58,130,246,0.06)',
    zoneStroke:      '#1a3558',
    zoneStrokeActive:'#3b82f6',
    wall:            '#1e3d5e',
    equipFill:       '#102843',
    equipStroke:     '#1e4565',
    equipStrokeInner:'#1e4060',
    label:           '#2d6090',
    sublabel:        '#1e4060',
    entrance:        '#1a3558',
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
      {ZONE_DEFS.map(z => {
        const isActive = activeZone === z.id
        return (
          <g key={z.id} onClick={() => onZoneClick?.(z.id)} style={{ cursor: onZoneClick ? 'pointer' : 'default' }}>
            <rect
              x={z.x} y={z.y} width={z.w} height={z.h} rx={5}
              fill={isActive ? c.zoneFillActive : (z.id === 'stretching' ? c.zoneFillAlt : c.zoneFill)}
              stroke={isActive ? c.zoneStrokeActive : c.zoneStroke}
              strokeWidth={isActive ? 1.5 : 1}
            />
          </g>
        )
      })}

      {/* Outer walls */}
      <rect x={1} y={1} width={398} height={238} rx={6} fill="none" stroke={c.wall} strokeWidth={1.5} />

      {/* Cardio: 4 treadmills */}
      <g opacity={0.38} style={{ pointerEvents: 'none' }}>
        {TREADMILL_X.map(x => (
          <g key={`t${x}`}>
            <rect x={x + 14} y={12} width={16} height={20} rx={2} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <rect x={x + 17} y={15} width={10} height={11} rx={1} fill={c.bg} stroke={c.equipStrokeInner} strokeWidth={0.5} />
            <rect x={x}      y={30} width={44}  height={28} rx={3} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
            <line x1={x + 8} y1={39} x2={x + 36} y2={39} stroke={c.equipStrokeInner} strokeWidth={0.6} />
            <line x1={x + 8} y1={46} x2={x + 36} y2={46} stroke={c.equipStrokeInner} strokeWidth={0.6} />
          </g>
        ))}
      </g>

      <text x={200} y={68} textAnchor="middle" fill={c.sublabel} fontSize={9} fontWeight="700" letterSpacing="1.5" style={{ pointerEvents:'none' }}>CARDIO · Treadmills · Ellipticals</text>
      <CountBadge zone={ZONE_DEFS[0]} counts={zoneCounts?.['cardio']} c={c} />

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
      <text x={98} y={152} textAnchor="middle" fill={c.sublabel} fontSize={7} fontWeight="700" letterSpacing="1.5" style={{ pointerEvents:'none' }}>FREE WEIGHTS</text>
      <CountBadge zone={ZONE_DEFS[1]} counts={zoneCounts?.['free_weight']} c={c} />

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
      <text x={302} y={152} textAnchor="middle" fill={c.sublabel} fontSize={9} fontWeight="700" letterSpacing="1.5" style={{ pointerEvents:'none' }}>MACHINES</text>
      <CountBadge zone={ZONE_DEFS[2]} counts={zoneCounts?.['machine']} c={c} />

      {/* Stretching: 2 mats */}
      <g opacity={0.38} style={{ pointerEvents: 'none' }}>
        {MAT_X.map(x => (
          <rect key={`mat${x}`} x={x} y={173} width={30} height={26} rx={10} fill={c.equipFill} stroke={c.equipStroke} strokeWidth={1} />
        ))}
      </g>
      <text x={200} y={233} textAnchor="middle" fill={c.sublabel} fontSize={7} fontWeight="700" letterSpacing="1.5" style={{ pointerEvents:'none' }}>STRETCHING · Yoga · Foam Rolling · Mobility</text>
      <CountBadge zone={ZONE_DEFS[3]} counts={zoneCounts?.['stretching']} c={c} />

      {/* Entrance */}
      <path d="M182,237 L200,229 L218,237" fill={c.entrance} style={{ pointerEvents:'none' }} />
    </svg>
  )
}
