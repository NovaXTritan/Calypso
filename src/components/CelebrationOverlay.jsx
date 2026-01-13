// CelebrationOverlay.jsx - Full-screen celebration with particles pulled into black hole
import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCelebration } from '../contexts/CelebrationContext'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

// Particle component with gravitational pull physics
function Particle({ index, centerX, centerY, color, delay, prefersReducedMotion }) {
  const angle = (index / 60) * Math.PI * 2 + Math.random() * 0.5
  const distance = 300 + Math.random() * 400
  const startX = Math.cos(angle) * distance
  const startY = Math.sin(angle) * distance
  const size = 4 + Math.random() * 8
  const duration = prefersReducedMotion ? 0.5 : 2 + Math.random() * 1.5

  // Random color from celebration palette
  const colors = [
    '#667dff', '#8b5cf6', '#f59e0b', '#10b981',
    '#ec4899', '#06b6d4', '#fbbf24', '#a78bfa'
  ]
  const particleColor = color || colors[index % colors.length]

  if (prefersReducedMotion) {
    return null
  }

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: particleColor,
        boxShadow: `0 0 ${size * 2}px ${particleColor}`,
        left: '50%',
        top: '50%',
      }}
      initial={{
        x: startX,
        y: startY,
        scale: 1,
        opacity: 0
      }}
      animate={{
        x: [startX, startX * 0.3, 0],
        y: [startY, startY * 0.3, 0],
        scale: [1, 1.2, 0],
        opacity: [0, 1, 1, 0]
      }}
      transition={{
        duration: duration,
        delay: delay + Math.random() * 0.3,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for gravitational feel
        times: [0, 0.6, 1]
      }}
    />
  )
}

// Sparkle effect
function Sparkle({ delay, prefersReducedMotion }) {
  const x = (Math.random() - 0.5) * window.innerWidth * 0.8
  const y = (Math.random() - 0.5) * window.innerHeight * 0.8

  if (prefersReducedMotion) return null

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-none"
      initial={{ x, y, scale: 0, opacity: 0 }}
      animate={{
        scale: [0, 1, 0],
        opacity: [0, 1, 0]
      }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: 'easeOut'
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path
          d="M10 0L11.5 8.5L20 10L11.5 11.5L10 20L8.5 11.5L0 10L8.5 8.5L10 0Z"
          fill="#fbbf24"
        />
      </svg>
    </motion.div>
  )
}

// Ring burst effect
function RingBurst({ delay, prefersReducedMotion }) {
  if (prefersReducedMotion) return null

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 pointer-events-none"
      style={{
        borderColor: 'rgba(102, 125, 255, 0.6)'
      }}
      initial={{ width: 0, height: 0, opacity: 1 }}
      animate={{
        width: [0, 600],
        height: [0, 600],
        opacity: [1, 0]
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: 'easeOut'
      }}
    />
  )
}

// Main celebration overlay
export default function CelebrationOverlay() {
  const { celebration, isActive, dismiss, celebrate } = useCelebration()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [shake, setShake] = useState(false)
  const containerRef = useRef(null)

  // DEV: Test celebrations with keyboard shortcuts (Ctrl+Shift+1-5)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey) {
        const tests = {
          '1': 'FIRST_PROOF',
          '2': 'STREAK_7',
          '3': 'STREAK_30',
          '4': 'STREAK_100',
          '5': 'ACHIEVEMENT'
        }
        if (tests[e.key]) {
          e.preventDefault()
          celebrate(tests[e.key], tests[e.key] === 'ACHIEVEMENT' ? {
            title: 'Early Bird',
            subtitle: 'Posted a proof before 8 AM',
            icon: '🌅'
          } : {})
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [celebrate])

  // Trigger screen shake
  useEffect(() => {
    if (isActive && !prefersReducedMotion) {
      setShake(true)
      const timer = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isActive, prefersReducedMotion])

  // Generate particles
  const particles = useMemo(() => {
    if (!celebration) return []
    const count = prefersReducedMotion ? 0 : (celebration.particleCount || 50)
    return Array.from({ length: count }, (_, i) => i)
  }, [celebration, prefersReducedMotion])

  // Generate sparkles
  const sparkles = useMemo(() => {
    if (!celebration || prefersReducedMotion) return []
    return Array.from({ length: 15 }, (_, i) => i)
  }, [celebration, prefersReducedMotion])

  if (!celebration) return null

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={containerRef}
          className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden ${
            shake ? 'animate-shake' : ''
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark overlay with radial gradient */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Central glow effect */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, rgba(102, 125, 255, 0.4) 0%, transparent 70%)`
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2, 1.5],
              opacity: [0, 1, 0.5]
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />

          {/* Ring bursts */}
          <RingBurst delay={0} prefersReducedMotion={prefersReducedMotion} />
          <RingBurst delay={0.2} prefersReducedMotion={prefersReducedMotion} />
          <RingBurst delay={0.4} prefersReducedMotion={prefersReducedMotion} />

          {/* Particles */}
          {particles.map((i) => (
            <Particle
              key={i}
              index={i}
              delay={0.1}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}

          {/* Sparkles */}
          {sparkles.map((i) => (
            <Sparkle
              key={`sparkle-${i}`}
              delay={0.5 + i * 0.1}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}

          {/* Achievement Card */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
            initial={{ scale: 0, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -50 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: 0.3
            }}
          >
            <div
              className={`relative px-8 py-6 rounded-2xl bg-gradient-to-br ${celebration.color || 'from-brand-500 to-glow-500'} shadow-2xl`}
              onClick={dismiss}
            >
              {/* Glow behind card */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${celebration.color || 'from-brand-500 to-glow-500'} blur-xl opacity-50 -z-10`}
              />

              {/* Icon */}
              <motion.div
                className="text-6xl text-center mb-3"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  delay: 0.5
                }}
              >
                {celebration.icon}
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-2xl font-bold text-white text-center mb-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                {celebration.title}
              </motion.h2>

              {/* Subtitle */}
              {celebration.subtitle && (
                <motion.p
                  className="text-white/80 text-center text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {celebration.subtitle}
                </motion.p>
              )}

              {/* Tap to dismiss hint */}
              <motion.p
                className="text-white/50 text-xs text-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                tap to dismiss
              </motion.p>
            </div>
          </motion.div>

          {/* Black hole pulse effect - positioned at actual black hole location */}
          <motion.div
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(102, 125, 255, 0.8) 0%, transparent 70%)',
              filter: 'blur(20px)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 3, 2],
              opacity: [0, 0.8, 0]
            }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
