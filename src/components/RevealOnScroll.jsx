// RevealOnScroll.jsx - Scroll-triggered reveal animation wrapper
import React, { useEffect, useRef, useState } from 'react'

export default function RevealOnScroll({
  children,
  className = '',
  type = 'up', // 'up' | 'scale'
  delay = 0,
  threshold = 0.1
}) {
  const ref = useRef(null)
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setIsRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add delay if specified
          if (delay > 0) {
            setTimeout(() => setIsRevealed(true), delay)
          } else {
            setIsRevealed(true)
          }
          observer.unobserve(element)
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [delay, threshold])

  const revealClass = type === 'scale' ? 'reveal-scale' : 'reveal-up'

  return (
    <div
      ref={ref}
      className={`${revealClass} ${isRevealed ? 'revealed' : ''} ${className}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
