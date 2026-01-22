// BlackHoleCanvas.jsx - OPTIMIZED VERSION
// Lazy loads Three.js only when the component becomes visible
// Saves 469 KB from initial bundle

import React, { lazy, Suspense, useState, useEffect, useRef, memo } from 'react'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

// Lazy load the Three.js component - this is the key optimization
const BlackHoleThree = lazy(() => import('./BlackHoleThree'))

// CSS gradient fallback for when Three.js hasn't loaded
function GradientFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(
            ellipse 50% 40% at 55% 50%,
            rgba(255, 150, 80, 0.15) 0%,
            rgba(255, 120, 60, 0.08) 30%,
            transparent 70%
          ),
          radial-gradient(
            circle at 50% 50%,
            #000 0%,
            #000 8%,
            transparent 8%
          ),
          radial-gradient(
            circle at 50% 50%,
            rgba(255, 180, 100, 0.1) 10%,
            transparent 40%
          ),
          linear-gradient(180deg, #0a0a0f 0%, #0d0d14 100%)
        `
      }}
    />
  )
}

// Simple loading state with pulsing effect
function LoadingState() {
  return (
    <div className="absolute inset-0 bg-night-950">
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: `
            radial-gradient(
              circle at 50% 50%,
              rgba(102, 125, 255, 0.1) 0%,
              transparent 50%
            )
          `
        }}
      />
    </div>
  )
}

// Custom hook to detect when element is in viewport
function useIntersectionObserver(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true)
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px', // Start loading slightly before visible
      ...options
    })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref, hasIntersected, options])

  return { isIntersecting, hasIntersected }
}

function BlackHoleCanvas({ intensity = 1.0 }) {
  const containerRef = useRef(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Track visibility for lazy loading
  const { isIntersecting, hasIntersected } = useIntersectionObserver(containerRef)

  // If user prefers reduced motion, show static gradient
  if (prefersReducedMotion) {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <GradientFallback />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      {hasIntersected ? (
        <Suspense fallback={<LoadingState />}>
          <BlackHoleThree intensity={intensity} />
        </Suspense>
      ) : (
        <GradientFallback />
      )}
    </div>
  )
}

export default memo(BlackHoleCanvas)
