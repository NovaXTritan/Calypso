import { useState, useEffect, useCallback, useRef } from 'react'

const THRESHOLD = 80 // pixels to pull before triggering refresh
const MAX_PULL = 120 // max pull distance

export default function usePullToRefresh(onRefresh) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const currentY = useRef(0)

  const handleTouchStart = useCallback((e) => {
    // Only enable pull-to-refresh when at top of page
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return
    if (window.scrollY > 0) {
      setIsPulling(false)
      setPullDistance(0)
      return
    }

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0) {
      // Apply resistance to make it feel more natural
      const resistance = 0.5
      const distance = Math.min(diff * resistance, MAX_PULL)
      setPullDistance(distance)

      // Prevent default scroll behavior when pulling
      if (distance > 10) {
        e.preventDefault()
      }
    }
  }, [isPulling, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }

      try {
        await onRefresh?.()
      } catch (error) {
        console.error('Refresh failed:', error)
      }

      setIsRefreshing(false)
    }

    setIsPulling(false)
    setPullDistance(0)
  }, [isPulling, pullDistance, isRefreshing, onRefresh])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    progress: Math.min(pullDistance / THRESHOLD, 1)
  }
}
