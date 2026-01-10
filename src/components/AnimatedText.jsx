// AnimatedText.jsx - Text that reveals word by word or as gradient
import React from 'react'
import { motion } from 'framer-motion'

// Word-by-word reveal animation
export function AnimatedHeadline({
  children,
  className = '',
  delay = 0,
  staggerDelay = 0.08
}) {
  // Ensure children is a string
  const text = typeof children === 'string' ? children : String(children || '')
  const words = text.split(' ').filter(Boolean)

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay
      }
    }
  }

  const child = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          className="mr-[0.25em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

// Gradient animated text
export function GradientText({ children, className = '' }) {
  return (
    <span className={`gradient-text-animated ${className}`}>
      {children}
    </span>
  )
}

// Simple fade-in text
export function FadeInText({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  as: Component = 'p'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      <Component className={className}>{children}</Component>
    </motion.div>
  )
}

export default AnimatedHeadline
