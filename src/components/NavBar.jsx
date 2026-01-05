import React, { useState, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { Rocket, LogOut, User, Scroll, Menu, X, Home, Users, Heart, BookOpen, Calendar, BarChart3, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { trackError, ErrorCategory } from '../utils/errorTracking'

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/pods', label: 'Pods', icon: Users },
  { to: '/matches', label: 'Matches', icon: Heart },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/events', label: 'Events', icon: Calendar },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const Item = ({to, children, onClick}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({isActive}) => `px-3 py-2 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-brand-500/60 ${isActive?'bg-white/10 text-white':'text-zinc-300 hover:text-white hover:bg-white/5'}`}
  >
    {children}
  </NavLink>
)

const MobileNavItem = ({to, label, icon: Icon, onClick}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition ${isActive?'bg-brand-500/20 text-brand-400 border border-brand-500/30':'text-zinc-300 hover:text-white hover:bg-white/5'}`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </NavLink>
)

export default function NavBar(){
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  async function handleLogout() {
    try {
      await logout()
      setMobileMenuOpen(false)
      navigate('/login')
    } catch (error) {
      trackError(error, { action: 'logout' }, 'error', ErrorCategory.AUTH)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-black/30 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-white font-semibold">
            <Rocket size={32} className="text-brand-400"/><span className="text-lg">Cosmos</span>
          </Link>

          {currentUser && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <Item key={item.to} to={item.to}>{item.label}</Item>
              ))}
            </nav>
          )}

          {/* Constitution link - visible to everyone on desktop */}
          <nav className="hidden md:flex items-center">
            <NavLink
              to="/constitution"
              className={({isActive}) => `px-3 py-2 rounded-xl transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500/60 ${isActive?'bg-gradient-to-r from-brand-400/20 to-glow-400/20 text-brand-400 border border-brand-400/30':'text-zinc-400 hover:text-brand-400 hover:bg-brand-400/5 border border-transparent'}`}
            >
              <Scroll size={16} />
              <span className="text-sm font-medium">Constitution</span>
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {currentUser ? (
              <>
                <Link to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition">
                  <User size={16} />
                  <span className="text-sm">{currentUser.displayName || 'Profile'}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition"
                >
                  <LogOut size={16} />
                  <span className="text-sm">Logout</span>
                </button>
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
                  aria-label="Open menu"
                >
                  <Menu size={20} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/constitution"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:text-brand-400 hover:bg-brand-400/5 transition md:hidden"
                >
                  <Scroll size={16} />
                </Link>
                <Link to="/login" className="btn-primary px-4 py-2 text-sm">
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-in Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-night-900 border-l border-white/10 z-50 md:hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <span className="text-lg font-semibold text-white">Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 transition"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Info */}
              {currentUser && (
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                      <User size={20} className="text-brand-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{currentUser.displayName || 'User'}</p>
                      <p className="text-sm text-zinc-400">{currentUser.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navItems.map(item => (
                  <MobileNavItem
                    key={item.to}
                    {...item}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
                <div className="pt-2 mt-2 border-t border-white/10">
                  <MobileNavItem
                    to="/constitution"
                    label="Constitution"
                    icon={Scroll}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                </div>
              </nav>

              {/* Logout Button */}
              {currentUser && (
                <div className="p-4 border-t border-white/10">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-zinc-300 hover:text-white"
                  >
                    <LogOut size={18} />
                    <span className="font-medium">Log Out</span>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
