// BlackHoleCanvas.jsx - Lazy-loaded Three.js Black Hole with visibility-based loading
// OPTIMIZED: Defers Three.js (469KB) until component is visible in viewport
import React, { Suspense, lazy, useState, useEffect, useRef, memo } from 'react'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

// Check WebGL support
function isWebGLSupported() {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

// CSS-only fallback component
function CSSFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse 400px 400px at 75% 50%, rgba(255,180,110,0.20), transparent 60%),
          radial-gradient(ellipse 200px 200px at 70% 50%, rgba(255,150,80,0.15), transparent 50%)
        `
      }}
    />
  )
}

// Loading fallback while Three.js loads
function LoadingFallback() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: `
            radial-gradient(ellipse 400px 400px at 75% 50%, rgba(255,180,110,0.15), transparent 60%),
            radial-gradient(ellipse 200px 200px at 70% 50%, rgba(255,150,80,0.10), transparent 50%)
          `
        }}
      />
    </div>
  )
}

// Lazy load the Three.js component
const BlackHoleThree = lazy(() => import('./BlackHoleThree'))

function BlackHoleCanvas({ intensity = 1.0 }) {
  const containerRef = useRef(null)
  const [webglSupported, setWebglSupported] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenVisible, setHasBeenVisible] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Check WebGL support on mount
  useEffect(() => {
    setWebglSupported(isWebGLSupported())
  }, [])

  // Visibility detection - only load Three.js when visible
  useEffect(() => {
    if (!containerRef.current || hasBeenVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
        if (entry.isIntersecting && !hasBeenVisible) {
          setHasBeenVisible(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Start loading slightly before visible
      }
    )

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [hasBeenVisible])

  // User prefers reduced motion - show static gradient
  if (prefersReducedMotion) {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <CSSFallback />
      </div>
    )
  }

  // Still checking WebGL support
  if (webglSupported === null) {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <LoadingFallback />
      </div>
    )
  }

  // WebGL not supported, show CSS fallback
  if (!webglSupported) {
    return (
      <div ref={containerRef} className="absolute inset-0">
        <CSSFallback />
      </div>
    )
  }

  // WebGL supported - only load Three.js when visible/has been visible
  return (
    <div ref={containerRef} className="absolute inset-0">
      {hasBeenVisible ? (
        <Suspense fallback={<LoadingFallback />}>
          <BlackHoleThree intensity={intensity} />
        </Suspense>
      ) : (
        <CSSFallback />
      )}
    </div>
  )
}

export default memo(BlackHoleCanvas)
