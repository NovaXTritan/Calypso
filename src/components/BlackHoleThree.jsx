// BlackHoleThree.jsx - Three.js Black Hole with MEMORY LEAK FIXES
// Properly disposes all WebGL resources and handles visibility changes

import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import useVisibility from '../hooks/useVisibility'
import useMouseParallax from '../hooks/useMouseParallax'
import useIsTouchDevice from '../hooks/useIsTouchDevice'

// Memoized texture creation - only create once
let cachedGlowTexture = null

function getGlowTexture() {
  if (cachedGlowTexture) return cachedGlowTexture

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createRadialGradient(size/2, size/2, 6, size/2, size/2, size/2)
  gradient.addColorStop(0, 'rgba(255,190,120,0.65)')
  gradient.addColorStop(0.3, 'rgba(255,160,95,0.40)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  cachedGlowTexture = new THREE.CanvasTexture(canvas)
  cachedGlowTexture.colorSpace = THREE.SRGBColorSpace
  return cachedGlowTexture
}

export default function BlackHoleThree({ intensity = 1.0 }) {
  const containerRef = useRef(null)
  const rafRef = useRef(0)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const objectsRef = useRef([]) // Track all disposable objects
  const lastFrameTime = useRef(0)
  const isDisposed = useRef(false)

  const prefersReduced = usePrefersReducedMotion()
  const visible = useVisibility()
  const target = useMouseParallax(0.02)
  const isMobile = useIsTouchDevice()

  // Memoize performance settings based on device
  const settings = useMemo(() => ({
    starCount: prefersReduced ? 400 : (isMobile ? 800 : 1600),
    starSpread: prefersReduced ? 60 : (isMobile ? 70 : 90),
    sphereSegments: isMobile ? 32 : 64,
    torusRadialSegments: isMobile ? 32 : 64,
    torusTubularSegments: isMobile ? 128 : 256,
    ringSegments: isMobile ? 64 : 256,
    pixelRatio: isMobile ? Math.min(1.5, window.devicePixelRatio) : Math.min(2, window.devicePixelRatio),
    antialias: !isMobile,
    // FPS cap: 30fps on mobile, 60fps on desktop
    frameInterval: isMobile ? 1000 / 30 : 1000 / 60
  }), [prefersReduced, isMobile])

  // Cleanup function to dispose all WebGL resources
  const disposeScene = useCallback(() => {
    if (isDisposed.current) return
    isDisposed.current = true

    // Cancel animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }

    // Dispose all tracked objects
    objectsRef.current.forEach(obj => {
      if (obj.geometry) {
        obj.geometry.dispose()
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => {
            if (m.map) m.map.dispose()
            m.dispose()
          })
        } else {
          if (obj.material.map) obj.material.map.dispose()
          obj.material.dispose()
        }
      }
    })
    objectsRef.current = []

    // Dispose scene
    if (sceneRef.current) {
      sceneRef.current.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      sceneRef.current.clear()
      sceneRef.current = null
    }

    // Dispose renderer
    if (rendererRef.current) {
      rendererRef.current.dispose()
      rendererRef.current.forceContextLoss()

      // Remove canvas from DOM
      const canvas = rendererRef.current.domElement
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }
      rendererRef.current = null
    }

    cameraRef.current = null
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    isDisposed.current = false

    // Create scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0.8, 8)
    cameraRef.current = camera

    // Create renderer with optimized settings
    const renderer = new THREE.WebGLRenderer({
      antialias: settings.antialias,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    })
    renderer.setPixelRatio(settings.pixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Create stars
    const starsGeometry = new THREE.BufferGeometry()
    const starCount = settings.starCount
    const positions = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const r = settings.starSpread * Math.pow(Math.random(), 0.35)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.015 })
    const stars = new THREE.Points(starsGeometry, starsMaterial)
    scene.add(stars)
    objectsRef.current.push(stars)

    // Create black hole core
    const coreGeometry = new THREE.SphereGeometry(1.1, settings.sphereSegments, settings.sphereSegments)
    const coreMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 })
    const core = new THREE.Mesh(coreGeometry, coreMaterial)
    scene.add(core)
    objectsRef.current.push(core)

    // Create lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.32)
    const key = new THREE.PointLight(0xffa060, 2.0, 60)
    key.position.set(6, 2, 6)
    scene.add(ambient, key)

    // Create accretion disk (torus)
    const torusGeometry = new THREE.TorusGeometry(
      2.3, 0.5,
      settings.torusRadialSegments,
      settings.torusTubularSegments
    )
    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0x221a10,
      emissive: 0xff9850,
      emissiveIntensity: 1.5 * intensity,
      roughness: 0.45,
      metalness: 0.65
    })
    const torus = new THREE.Mesh(torusGeometry, torusMaterial)
    torus.rotation.x = Math.PI / 2.35
    scene.add(torus)
    objectsRef.current.push(torus)

    // Create outer ring
    const ringGeometry = new THREE.TorusGeometry(3.2, 0.14, 16, settings.ringSegments)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb36b,
      transparent: true,
      opacity: 0.25
    })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.rotation.x = Math.PI / 2.35
    scene.add(ring)
    objectsRef.current.push(ring)

    // Create glow sprite
    const glowMaterial = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      depthWrite: false,
      depthTest: false
    })
    const glow = new THREE.Sprite(glowMaterial)
    glow.scale.set(10, 10, 1)
    glow.position.set(1.2, 0, 0)
    scene.add(glow)
    objectsRef.current.push(glow)

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer || isDisposed.current) return

      const width = container.clientWidth
      const height = container.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    // Handle visibility change (pause when tab hidden)
    const handleVisibilityChange = () => {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      } else if (!document.hidden && !rafRef.current && !isDisposed.current) {
        lastFrameTime.current = 0
        tick()
      }
    }

    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Animation loop with FPS limiting
    const tick = (currentTime = 0) => {
      if (isDisposed.current) return

      rafRef.current = requestAnimationFrame(tick)

      // FPS limiting
      const deltaTime = currentTime - lastFrameTime.current
      if (deltaTime < settings.frameInterval) return
      lastFrameTime.current = currentTime - (deltaTime % settings.frameInterval)

      // Only render if visible
      if (!visible || document.hidden) return

      // Update camera position from mouse parallax
      const tx = target.current?.x || 0
      const ty = target.current?.y || 0
      camera.position.x = tx
      camera.position.y = 0.8 + ty * 0.2
      camera.lookAt(0, 0, 0)

      // Animate if reduced motion not preferred
      if (!prefersReduced) {
        const frameRatio = deltaTime / 16.67 // Normalize to 60fps

        stars.rotation.y += 0.0007 * frameRatio
        torus.rotation.z += 0.004 * frameRatio
        ring.rotation.z -= 0.002 * frameRatio
        glow.material.rotation += 0.0008 * frameRatio
      }

      renderer.render(scene, camera)
    }

    // Start animation
    tick()

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      disposeScene()
    }
  }, [prefersReduced, visible, intensity, settings, disposeScene, target])

  return <div ref={containerRef} className="absolute inset-0" />
}
