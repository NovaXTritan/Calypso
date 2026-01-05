import React from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Rocket, LogOut, User, Scroll } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Item = ({to, children}) => (
  <NavLink to={to} className={({isActive}) => `px-3 py-2 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-brand-500/60 ${isActive?'bg-white/10 text-white':'text-zinc-300 hover:text-white hover:bg-white/5'}`}>{children}</NavLink>
)

export default function NavBar(){
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out:', error)
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-black/30 backdrop-blur border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-white font-semibold">
          <Rocket size={50} className="text-brand-400"/><span>Cosmos</span>
        </Link>
        
        {currentUser && (
          <nav className="hidden md:flex items-center gap-1">
            <Item to="/">Home</Item>
            <Item to="/pods">Pods</Item>
            <Item to="/matches">Matches</Item>
            <Item to="/journal">Journal</Item>
            <Item to="/events">Events</Item>
            <Item to="/analytics">Analytics</Item>
            <Item to="/profile">Profile</Item>
            <Item to="/settings">Settings</Item>
          </nav>
        )}

        {/* Constitution link - visible to everyone */}
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
              <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition">
                <User size={16} />
                <span className="text-sm hidden sm:inline">{currentUser.displayName || 'Profile'}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500/60 transition"
              >
                <LogOut size={16} />
                <span className="text-sm hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              {/* Constitution link visible when logged out too */}
              <Link 
                to="/constitution"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-400 hover:text-brand-400 hover:bg-brand-400/5 transition md:hidden"
              >
                <Scroll size={16} />
                <span className="text-sm">Constitution</span>
              </Link>
              <Link to="/login" className="btn-primary px-4 py-2">
                Log In
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
