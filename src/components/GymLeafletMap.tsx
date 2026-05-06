import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Actual hex values matching global.css CSS vars (DivIcon HTML can't use CSS vars)
const CSS_COLORS: Record<string, string> = {
  'var(--brand)':   '#4178ff',
  'var(--z-red)':   '#ef4444',
  'var(--z-green)': '#22c55e',
  'var(--z-blue)':  '#3b82f6',
}
function resolveColor(c: string): string {
  return CSS_COLORS[c] ?? c
}

export interface LiveDot {
  id: string
  lat: number
  lng: number
  initials: string
  color: string
  accuracy?: number   // metres — draws uncertainty circle for own dot
  isYou?: boolean
  heading?: number | null
  onClick?: () => void
}

interface Props {
  dots: LiveDot[]
  initialCenter?: { lat: number; lng: number }
}

function makeDotIcon(dot: LiveDot): L.DivIcon {
  const color  = resolveColor(dot.color)
  const r      = dot.isYou ? 15 : 12
  const pad    = dot.heading != null ? 14 : 2
  const size   = (r + pad) * 2
  const cx     = size / 2
  const cy     = size / 2

  const glow = dot.isYou
    ? `<circle cx="${cx}" cy="${cy}" r="${r + 7}" fill="${color}" opacity="0.18"/>`
    : ''

  const arrow = dot.heading != null ? `
    <polygon
      points="${cx},${cy - r - 11} ${cx - 4},${cy - r - 3} ${cx + 4},${cy - r - 3}"
      fill="${color}" stroke="white" stroke-width="0.8" opacity="0.95"
      transform="rotate(${dot.heading}, ${cx}, ${cy})"
    />` : ''

  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${glow}
    ${arrow}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.93"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="1.5"/>
    <text x="${cx}" y="${cy + 3.5}" text-anchor="middle"
      fill="white" font-size="${dot.isYou ? 8 : 7}" font-weight="900" font-family="sans-serif">
      ${dot.initials.slice(0, 3)}
    </text>
  </svg>`

  return L.divIcon({
    className: '',
    html: svg,
    iconSize:   [size, size],
    iconAnchor: [cx, cy],
  })
}

// Inner component — imperative marker management so dots don't flicker on every GPS update
function MapContent({ dots }: { dots: LiveDot[] }) {
  const map         = useMap()
  const centeredRef = useRef(false)
  const markersRef  = useRef<Map<string, L.Marker>>(new Map())
  const circlesRef  = useRef<Map<string, L.Circle>>(new Map())

  // Auto-center on own position once
  const youDot = dots.find(d => d.isYou)
  useEffect(() => {
    if (youDot && !centeredRef.current) {
      map.setView([youDot.lat, youDot.lng], 20)
      centeredRef.current = true
    }
  }, [youDot, map])

  // Update markers imperatively — avoids full remount on every GPS tick
  useEffect(() => {
    const currentIds = new Set(dots.map(d => d.id))

    // Remove stale
    markersRef.current.forEach((m, id) => {
      if (!currentIds.has(id)) { m.remove(); markersRef.current.delete(id) }
    })
    circlesRef.current.forEach((c, id) => {
      if (!currentIds.has(id)) { c.remove(); circlesRef.current.delete(id) }
    })

    for (const dot of dots) {
      const latlng: L.LatLngExpression = [dot.lat, dot.lng]
      const icon = makeDotIcon(dot)
      let marker = markersRef.current.get(dot.id)
      if (marker) {
        marker.setLatLng(latlng)
        marker.setIcon(icon)
      } else {
        marker = L.marker(latlng, {
          icon,
          interactive: !!dot.onClick,
          zIndexOffset: dot.isYou ? 1000 : 0,
        })
        if (dot.onClick) marker.on('click', dot.onClick)
        marker.addTo(map)
        markersRef.current.set(dot.id, marker)
      }

      // Accuracy ring for own dot
      if (dot.isYou && dot.accuracy != null) {
        const hexColor = resolveColor(dot.color)
        let circle = circlesRef.current.get(dot.id)
        if (circle) {
          circle.setLatLng(latlng)
          circle.setRadius(dot.accuracy)
        } else {
          circle = L.circle(latlng, {
            radius: dot.accuracy,
            color: hexColor, fillColor: hexColor,
            fillOpacity: 0.08, weight: 1.2,
          }).addTo(map)
          circlesRef.current.set(dot.id, circle)
        }
      }
    }
  }, [dots, map])

  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.remove())
      circlesRef.current.forEach(c => c.remove())
    }
  }, [map])

  return null
}

const FALLBACK_CENTER: L.LatLngExpression = [22.3193, 114.1694] // Hong Kong fallback

export function GymLeafletMap({ dots, initialCenter }: Props) {
  const youDot = dots.find(d => d.isYou)
  const center: L.LatLngExpression = youDot
    ? [youDot.lat, youDot.lng]
    : initialCenter
      ? [initialCenter.lat, initialCenter.lng]
      : FALLBACK_CENTER

  return (
    <MapContainer
      center={center}
      zoom={20}
      style={{ width: '100%', height: '100%', borderRadius: 8 }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
    >
      {/* Esri satellite tiles — free, no API key, good zoom level */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={22}
        maxNativeZoom={19}
      />
      <MapContent dots={dots} />
    </MapContainer>
  )
}
