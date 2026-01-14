import { useState, useEffect } from 'react'

/**
 * Detects if the device is primarily touch-based.
 * Returns true for mobile/tablet devices to skip pointer-only effects.
 */
export default function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(hover: none)').matches || 'ontouchstart' in window
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: none)')
    const handler = (e) => setIsTouch(e.matches)

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isTouch
}
