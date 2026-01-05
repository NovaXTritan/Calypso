import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Users, BookOpen, BarChart3, User } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/pods', label: 'Pods', icon: Users },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/analytics', label: 'Stats', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-night-900/95 backdrop-blur-lg border-t border-white/10 safe-bottom"
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to ||
            (to !== '/' && location.pathname.startsWith(to))

          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px]"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`relative p-2 rounded-xl transition-colors ${
                isActive ? 'bg-brand-500/20' : ''
              }`}>
                <Icon
                  size={22}
                  className={`transition-colors ${
                    isActive ? 'text-brand-400' : 'text-zinc-500'
                  }`}
                />
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute inset-0 bg-brand-500/20 rounded-xl"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium transition-colors ${
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
