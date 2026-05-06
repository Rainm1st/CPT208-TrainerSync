import { useState, useEffect, useCallback, useRef } from 'react'
import { gpsToGym } from '../lib/gymConfig'

const ORIGIN_KEY       = 'gym_origin_v1'
const ACCURACY_LIMIT   = 25   // ignore readings worse than this (metres)
const EMA_ALPHA        = 0.35 // 0=never move, 1=no smoothing; 0.35 feels responsive

interface GpsOrigin { lat: number; lng: number }

export interface GymPosition {
  x: number
  y: number
  fromGps: boolean
}

export interface GpsDebug {
  lat: number
  lng: number
  accuracy: number
  gpsHeading: number | null
  updateCount: number
  lastAt: number
}

function loadOrigin(): GpsOrigin | null {
  try {
    const raw = localStorage.getItem(ORIGIN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveOrigin(o: GpsOrigin) {
  localStorage.setItem(ORIGIN_KEY, JSON.stringify(o))
}

export function useGymLocation(pollIntervalMs = 1000) {
  const [pos, setPos]               = useState<GymPosition | null>(null)
  const [rawCoords, setRawCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const [accuracy, setAccuracy]     = useState<number | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [hasGps, setHasGps]         = useState(false)
  const [debug, setDebug]           = useState<GpsDebug | null>(null)
  const [gpsHeading, setGpsHeading] = useState<number | null>(null)

  const originRef    = useRef<GpsOrigin | null>(loadOrigin())
  const smoothRef    = useRef<{ lat: number; lng: number } | null>(null)
  const updateCount  = useRef(0)

  const applyGps = useCallback((
    lat: number, lng: number, acc: number, rawHeading: number | null
  ) => {
    // Drop readings that are too inaccurate
    if (acc > ACCURACY_LIMIT) return

    // EMA smoothing — reduces GPS noise significantly
    const prev = smoothRef.current
    const sLat = prev ? prev.lat * (1 - EMA_ALPHA) + lat * EMA_ALPHA : lat
    const sLng = prev ? prev.lng * (1 - EMA_ALPHA) + lng * EMA_ALPHA : lng
    smoothRef.current = { lat: sLat, lng: sLng }

    // Set origin on first good fix
    let origin = originRef.current
    if (!origin) {
      origin = { lat: sLat, lng: sLng }
      originRef.current = origin
      saveOrigin(origin)
    }

    const mapped = gpsToGym(sLat, sLng, origin.lat, origin.lng)
    setPos({ ...mapped, fromGps: true })
    setRawCoords({ lat: sLat, lng: sLng })
    setAccuracy(acc)
    setHasGps(true)
    setError(null)

    const h = (rawHeading != null && !isNaN(rawHeading)) ? rawHeading : null
    setGpsHeading(h)
    updateCount.current += 1
    setDebug({ lat: sLat, lng: sLng, accuracy: acc, gpsHeading: h, updateCount: updateCount.current, lastAt: Date.now() })
  }, [])

  const calibrate = useCallback(() => {
    originRef.current = null
    smoothRef.current = null
    localStorage.removeItem(ORIGIN_KEY)
    setPos(null)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('GPS not supported')
      return
    }

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }

    const onSuccess = (geo: GeolocationPosition) => {
      applyGps(geo.coords.latitude, geo.coords.longitude, geo.coords.accuracy, geo.coords.heading)
    }

    const onError = (e: GeolocationPositionError) => {
      setError(`GPS error ${e.code}: ${e.message}`)
    }

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, opts)

    const pollId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(onSuccess, () => {}, opts)
    }, pollIntervalMs)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      clearInterval(pollId)
    }
  }, [applyGps, pollIntervalMs])

  return { pos, rawCoords, accuracy, error, hasGps, debug, gpsHeading, calibrate }
}
