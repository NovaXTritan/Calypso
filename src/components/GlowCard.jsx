// GlowCard.jsx - Enhanced card with ambient glow effect on hover
import React from 'react'

export default function GlowCard({
  children,
  className = '',
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`glow-card p-6 ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
