import React, { useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Users, BookOpen, BarChart3, User } from 'lucide-react'
import { motion } from 'framer-motion'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/pods', label: 'Pods', icon: Users },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/analytics', label: 'Stats', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function BottomNav() {
  const location = useLocation()
  const prefersReducedMotion = usePrefersReducedMotion()

  // Haptic feedback on tap (if supported)
  const handleTap = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }, [])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-night-900/95 backdrop-blur-lg border-t border-white/10 bottom-nav-safe"
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to ||
            (to !== '/' && location.pathname.startsWith(to))

          return (
            <NavLink
              key={to}
              to={to}
              onClick={handleTap}
              className="relative flex flex-col items-center justify-center py-2 px-2 min-w-[56px] min-h-[56px] touch-manipulation active:scale-95 transition-transform duration-75"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`relative p-2.5 rounded-xl transition-colors ${
                isActive ? 'bg-brand-500/20' : 'active:bg-white/5'
              }`}>
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors ${
                    isActive ? 'text-brand-400' : 'text-zinc-500'
                  }`}
                />
                {isActive && !prefersReducedMotion && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute inset-0 bg-brand-500/20 rounded-xl -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                {isActive && prefersReducedMotion && (
                  <div className="absolute inset-0 bg-brand-500/20 rounded-xl -z-10" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 font-medium transition-colors ${
                isActive ? 'text-brand-400' : 'text-zinc-500'
              }`}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
