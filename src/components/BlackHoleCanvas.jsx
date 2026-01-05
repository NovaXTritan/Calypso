// BlackHoleCanvas.jsx - Lazy-loaded Three.js Black Hole with CSS fallback
import React, { Suspense, lazy, useState, useEffect } from 'react'

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

export default function BlackHoleCanvas({ intensity = 1.0 }) {
  const [webglSupported, setWebglSupported] = useState(null)

  useEffect(() => {
    setWebglSupported(isWebGLSupported())
  }, [])

  // Still checking WebGL support
  if (webglSupported === null) {
    return <LoadingFallback />
  }

  // WebGL not supported, show CSS fallback
  if (!webglSupported) {
    return <CSSFallback />
  }

  // WebGL supported, lazy load Three.js
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BlackHoleThree intensity={intensity} />
    </Suspense>
  )
}
