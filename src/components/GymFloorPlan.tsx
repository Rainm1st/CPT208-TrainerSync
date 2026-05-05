export interface GymDot {
  id: string
  x: number        // 0–1 across the floor plan width
  y: number        // 0–1 across the floor plan height
  initials: string
  color: string    // CSS color or var(--x)
  isYou?: boolean
  heading?: number | null  // compass degrees 0=North, 90=East; null = unknown
  onClick?: () => void
}

interface Props {
  dots: GymDot[]
}

const VW = 400
const VH = 240

// Treadmill X positions inside the Cardio zone
const TREADMILL_X  = [18, 80, 142, 204, 266]
// Stationary bike centres
const BIKE_X       = [328, 368]
// Machine cabinet X positions inside the Machines zone
const MACHINE_X    = [216, 244, 272, 300, 328, 358]
// Yoga-mat X positions inside the Stretching zone
const MAT_X        = [20, 92, 164, 236, 308, 360]
// Dumbbell pairs [cx, cy] inside the Free Weights zone
const DUMBBELLS    = [
  [110, 100], [136, 100], [162, 100],
  [110, 126], [136, 126], [162, 126],
]

export function GymFloorPlan({ dots }: Props) {
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      {/* ── Background ───────────────────────────────────── */}
      <rect width={VW} height={VH} fill="#09131e" rx={8} />

      {/* ── Zone fills ───────────────────────────────────── */}
      {/* Cardio — top strip */}
      <rect x={2}   y={2}   width={396} height={76} rx={5} fill="#0d1e32" stroke="#1a3558" strokeWidth={1} />
      {/* Free Weights — bottom-left */}
      <rect x={2}   y={82}  width={193} height={75} rx={5} fill="#0c1c2f" stroke="#1a3558" strokeWidth={1} />
      {/* Machines — bottom-right */}
      <rect x={205} y={82}  width={193} height={75} rx={5} fill="#0c1c2f" stroke="#1a3558" strokeWidth={1} />
      {/* Stretching / Mat — bottom strip */}
      <rect x={2}   y={161} width={396} height={77} rx={5} fill="#0b1b2d" stroke="#1a3558" strokeWidth={1} />

      {/* ── Outer walls ──────────────────────────────────── */}
      <rect x={1} y={1} width={398} height={238} rx={6} fill="none" stroke="#1e3d5e" strokeWidth={1.5} />

      {/* ── Cardio equipment: treadmills ─────────────────── */}
      {TREADMILL_X.map(x => (
        <g key={`t${x}`}>
          {/* Console / screen */}
          <rect x={x + 14} y={12} width={16} height={20} rx={2} fill="#102843" stroke="#1e4565" strokeWidth={1} />
          <rect x={x + 17} y={15} width={10} height={11} rx={1} fill="#0a1e32" stroke="#1e4060" strokeWidth={0.5} />
          {/* Running belt */}
          <rect x={x}      y={30}  width={44}  height={28} rx={3} fill="#102843" stroke="#1e4565" strokeWidth={1} />
          <line x1={x + 8} y1={39} x2={x + 36} y2={39} stroke="#1e4060" strokeWidth={0.6} />
          <line x1={x + 8} y1={46} x2={x + 36} y2={46} stroke="#1e4060" strokeWidth={0.6} />
        </g>
      ))}

      {/* Cardio equipment: stationary bikes */}
      {BIKE_X.map(cx => (
        <g key={`b${cx}`}>
          <circle cx={cx} cy={40} r={18} fill="none" stroke="#1e4565" strokeWidth={1.5} />
          <circle cx={cx} cy={40} r={5}  fill="#102843" stroke="#1e4565" strokeWidth={1} />
          <line x1={cx - 9} y1={24} x2={cx + 9} y2={24} stroke="#1e4565" strokeWidth={2} strokeLinecap="round" />
        </g>
      ))}

      {/* Zone label: CARDIO */}
      <text x={200} y={44} textAnchor="middle" fill="#2d6090" fontSize={8} fontWeight="800" letterSpacing="2.5">CARDIO</text>
      <text x={200} y={56} textAnchor="middle" fill="#1e4060" fontSize={6.5}>Treadmills · Bikes · Ellipticals</text>

      {/* ── Free Weights equipment ───────────────────────── */}
      {/* Barbell */}
      <circle cx={28} cy={108} r={11} fill="#102843" stroke="#1e4565" strokeWidth={1.5} />
      <rect   x={39}  y={105}  width={58} height={6} rx={3} fill="#102843" stroke="#1e4565" strokeWidth={1} />
      <circle cx={97} cy={108} r={11} fill="#102843" stroke="#1e4565" strokeWidth={1.5} />

      {/* Power-rack uprights */}
      <rect x={26} y={116} width={6} height={22} rx={2} fill="#102843" stroke="#1e4060" strokeWidth={0.8} />
      <rect x={90} y={116} width={6} height={22} rx={2} fill="#102843" stroke="#1e4060" strokeWidth={0.8} />

      {/* Dumbbell rack */}
      {(DUMBBELLS as [number, number][]).map(([cx, cy]) => (
        <g key={`d${cx}${cy}`}>
          <circle cx={cx}       cy={cy} r={6} fill="#102843" stroke="#1e4565" strokeWidth={1} />
          <rect   x={cx + 6}    y={cy - 2.5} width={10} height={5} rx={2.5} fill="#102843" stroke="#1e4060" strokeWidth={0.6} />
          <circle cx={cx + 16}  cy={cy} r={6} fill="#102843" stroke="#1e4565" strokeWidth={1} />
        </g>
      ))}

      <text x={98} y={150} textAnchor="middle" fill="#2d6090" fontSize={7.5} fontWeight="800" letterSpacing="1.5">FREE WEIGHTS</text>
      <text x={98} y={160} textAnchor="middle" fill="#1e4060" fontSize={6}>Barbells · Dumbbells · Racks</text>

      {/* ── Machines equipment ───────────────────────────── */}
      {MACHINE_X.map(x => (
        <g key={`m${x}`}>
          <rect x={x}     y={88}  width={22} height={52} rx={3} fill="#102843" stroke="#1e4565" strokeWidth={1} />
          <rect x={x + 4} y={93}  width={14} height={18} rx={2} fill="#0a1e32" stroke="#1e4060" strokeWidth={0.6} />
          <rect x={x + 6} y={114} width={10} height={8}  rx={2} fill="#102843" stroke="#1e4060" strokeWidth={0.5} />
        </g>
      ))}

      <text x={302} y={150} textAnchor="middle" fill="#2d6090" fontSize={7.5} fontWeight="800" letterSpacing="1.5">MACHINES</text>
      <text x={302} y={160} textAnchor="middle" fill="#1e4060" fontSize={6}>Cable · Lat Pull · Row · Press</text>

      {/* ── Stretching zone: yoga mats ───────────────────── */}
      {MAT_X.map(x => (
        <rect key={`mat${x}`} x={x} y={173} width={30} height={26} rx={10} fill="#102843" stroke="#1e4565" strokeWidth={1} />
      ))}
      <text x={200} y={214} textAnchor="middle" fill="#2d6090" fontSize={7.5} fontWeight="800" letterSpacing="1.5">STRETCHING</text>
      <text x={200} y={224} textAnchor="middle" fill="#1e4060" fontSize={6}>Yoga · Foam Rolling · Mobility</text>

      {/* ── Entrance indicator ───────────────────────────── */}
      <path d="M182,237 L200,229 L218,237" fill="#1a3558" />
      <text x={200} y={237} textAnchor="middle" fill="#1e4060" fontSize={5.5} letterSpacing="1.5">ENTRANCE</text>

      {/* ── User dots — rendered last so they sit on top ─── */}
      {dots.map(dot => {
        const cx = dot.x * VW
        const cy = dot.y * VH
        const r  = dot.isYou ? 11 : 9
        return (
          <g key={dot.id} onClick={dot.onClick} style={{ cursor: dot.onClick ? 'pointer' : 'default' }}>
            {dot.isYou && (
              <circle cx={cx} cy={cy} r={r + 7} fill={dot.color} opacity={0.12} />
            )}
            <circle cx={cx} cy={cy} r={r} fill={dot.color} opacity={0.92} />
            {/* Direction pointer: triangle pointing in heading direction */}
            {dot.heading != null && (
              <polygon
                points={`0,${-(r + 9)} -4,${-(r + 2)} 4,${-(r + 2)}`}
                fill={dot.color}
                opacity={0.95}
                stroke="#fff"
                strokeWidth={0.6}
                transform={`translate(${cx},${cy}) rotate(${dot.heading})`}
                style={{ pointerEvents: 'none' }}
              />
            )}
            <text
              x={cx} y={cy + 3.5}
              textAnchor="middle"
              fill="#fff"
              fontSize={dot.isYou ? 7 : 6.5}
              fontWeight="900"
              style={{ pointerEvents: 'none' }}
            >
              {dot.initials.slice(0, 2)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
