// Physical size of the gym floor plan in metres — adjust to match your actual gym.
// These define how far you have to walk (in the real world) to cross the full map.
// Scale: the full map represents GYM_WIDTH_M × GYM_HEIGHT_M metres of real floor.
// At these values, 1 cm on a phone screen ≈ 2 m in the real gym.
// The SVG map is ~6.7 cm wide × 4 cm tall on a typical phone (350 × 210 CSS px at ~52 px/cm).
// Formula: GYM_WIDTH_M = map_cm_wide × metres_per_cm  →  6.7 × 2 ≈ 13
// If dots move too little → lower these numbers. Too much → raise them.
export const GYM_WIDTH_M  = 13   // east-west  (≈ 1 cm on screen = 2 m)
export const GYM_HEIGHT_M = 8    // north-south (≈ 1 cm on screen = 2 m)

const DEG_PER_M_LAT = 1 / 111_000   // 1 degree latitude ≈ 111 km

/**
 * Convert a GPS coordinate into a normalised [0–1, 0–1] position on the floor plan,
 * relative to a stored origin point (the gym centre / calibration fix).
 *
 * x: 0 = west wall, 1 = east wall
 * y: 0 = north wall, 1 = south wall  (screen-y is inverted from latitude)
 */
export function gpsToGym(
  lat: number, lng: number,
  originLat: number, originLng: number,
): { x: number; y: number } {
  const degPerMLng = DEG_PER_M_LAT / Math.cos(originLat * (Math.PI / 180))

  const dx = (lng - originLng) / (degPerMLng  * GYM_WIDTH_M)
  const dy = (lat - originLat) / (DEG_PER_M_LAT * GYM_HEIGHT_M)

  return {
    x: Math.max(0.02, Math.min(0.98, 0.5 + dx)),
    y: Math.max(0.02, Math.min(0.98, 0.5 - dy)),  // north = top = smaller y
  }
}
