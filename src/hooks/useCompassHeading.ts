import { useState, useEffect, useCallback } from 'react'

// Returns compass heading in degrees: 0 = North, 90 = East, 180 = South, 270 = West.
// On iOS 13+ DeviceOrientationEvent requires a user-gesture permission prompt.

export function useCompassHeading() {
  const [heading, setHeading]             = useState<number | null>(null)
  const [needsPermission, setNeedsPermission] = useState(false)

  const startListening = useCallback(() => {
    const handler = (e: DeviceOrientationEvent) => {
      // iOS exposes webkitCompassHeading (already true-north, clockwise)
      const wk = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      if (wk != null) {
        setHeading(wk)
        return
      }
      // Android: alpha is degrees counter-clockwise from arbitrary start — negate to get clockwise
      if (e.alpha != null) {
        setHeading((360 - e.alpha) % 360)
      }
    }

    window.addEventListener('deviceorientation', handler, true)
    return () => window.removeEventListener('deviceorientation', handler, true)
  }, [])

  useEffect(() => {
    const DevOri = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }

    if (typeof DevOri.requestPermission === 'function') {
      // iOS 13+ — can't auto-request, need a user gesture
      setNeedsPermission(true)
      return
    }

    // Android / desktop — start immediately
    return startListening()
  }, [startListening])

  // Call this from a button click on iOS
  const requestPermission = useCallback(async () => {
    const DevOri = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof DevOri.requestPermission !== 'function') return
    const result = await DevOri.requestPermission()
    if (result === 'granted') {
      setNeedsPermission(false)
      startListening()
    }
  }, [startListening])

  return { heading, needsPermission, requestPermission }
}
