// Leaderboard.jsx - Full leaderboard page with multiple categories
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import {
  Flame,
  Trophy,
  TrendingUp,
  Medal,
  Crown,
  Star,
  Users,
  RefreshCw
} from 'lucide-react'
import SEO from '../components/SEO'

// Leaderboard categories
const CATEGORIES = [
  { id: 'streak', label: 'Streak', icon: Flame, field: 'streak', color: 'text-orange-400' },
  { id: 'proofs', label: 'Total Proofs', icon: TrendingUp, field: 'totalProofs', color: 'text-brand-400' },
  { id: 'pods', label: 'Pods Joined', icon: Users, field: 'joinedPods', color: 'text-glow-400' }
]

// Medal colors for top 3
const MEDAL_STYLES = [
  { bg: 'bg-yellow-500', text: 'text-black', icon: Crown },
  { bg: 'bg-zinc-400', text: 'text-black', icon: Medal },
  { bg: 'bg-orange-700', text: 'text-white', icon: Medal }
]

export default function Leaderboard() {
  const { currentUser } = useAuth()
  const [activeCategory, setActiveCategory] = useState('streak')
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [userRank, setUserRank] = useState(null)

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)

      try {
        const category = CATEGORIES.find(c => c.id === activeCategory)
        let q

        if (activeCategory === 'pods') {
          // For pods, we need to count array length
          q = query(collection(db, 'users'), limit(100))
        } else {
          q = query(
            collection(db, 'users'),
            orderBy(category.field, 'desc'),
            limit(50)
          )
        }

        const snapshot = await getDocs(q)
        let users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Sort by pods count if that's the category
        if (activeCategory === 'pods') {
          users = users
            .map(u => ({ ...u, podsCount: u.joinedPods?.length || 0 }))
            .sort((a, b) => b.podsCount - a.podsCount)
            .slice(0, 50)
        }

        setLeaderboard(users)

        // Find current user's rank
        if (currentUser?.uid) {
          const userIndex = users.findIndex(u => u.id === currentUser.uid)
          if (userIndex !== -1) {
            setUserRank(userIndex + 1)
          } else {
            setUserRank(null)
          }
        }
      } catch (err) {
        trackError(err, { action: 'fetchLeaderboard', category: activeCategory }, 'error', ErrorCategory.FIRESTORE)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [activeCategory, currentUser?.uid])

  // Get value for display based on category
  const getValue = (user) => {
    switch (activeCategory) {
      case 'streak':
        return user.streak || 0
      case 'proofs':
        return user.totalProofs || 0
      case 'pods':
        return user.joinedPods?.length || 0
      default:
        return 0
    }
  }

  const activeCat = CATEGORIES.find(c => c.id === activeCategory)
  const ActiveIcon = activeCat?.icon || Trophy

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <SEO
        title="Leaderboard"
        description="See who's leading in streaks, proofs, and pod participation. Compete with peers and climb the ranks!"
        path="/leaderboard"
      />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-zinc-400">See who's crushing it in the community</p>
      </div>

      {/* Category Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {CATEGORIES.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
              activeCategory === id
                ? 'bg-white/10 border border-white/20'
                : 'hover:bg-white/5'
            }`}
          >
            <Icon className={`w-5 h-5 ${activeCategory === id ? color : 'text-zinc-400'}`} />
            <span className={activeCategory === id ? 'text-white font-medium' : 'text-zinc-400'}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* User's Rank Card */}
      {currentUser && userRank && (
        <div className="glass p-4 rounded-xl mb-6 border border-brand-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 flex items-center justify-center text-white font-bold">
                #{userRank}
              </div>
              <div>
                <span className="text-white font-medium">Your Rank</span>
                <p className="text-sm text-zinc-400">Keep going to climb higher!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ActiveIcon className={`w-5 h-5 ${activeCat?.color}`} />
              <span className="text-xl font-bold text-white">{getValue(currentUser)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mx-auto mb-3" />
            <p className="text-zinc-400">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center">
            <Trophy className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">No users on the leaderboard yet</p>
            <p className="text-sm text-zinc-500 mt-1">Be the first to claim the top spot!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {leaderboard.map((user, index) => {
              const isCurrentUser = user.id === currentUser?.uid
              const isTopThree = index < 3
              const medalStyle = MEDAL_STYLES[index]

              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-4 transition-colors ${
                    isCurrentUser ? 'bg-brand-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-10 flex justify-center">
                    {isTopThree ? (
                      <span className={`w-8 h-8 rounded-full ${medalStyle.bg} ${medalStyle.text} flex items-center justify-center font-bold text-sm`}>
                        {index + 1}
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-medium">#{index + 1}</span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 flex items-center justify-center text-white font-bold">
                        {user.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isCurrentUser ? 'text-brand-400' : 'text-white'}`}>
                          {user.displayName || 'Anonymous'}
                        </span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 bg-brand-500/20 rounded-full text-xs text-brand-400">
                            You
                          </span>
                        )}
                        {isTopThree && (
                          <Star className={`w-4 h-4 ${index === 0 ? 'text-yellow-400' : 'text-zinc-500'}`} />
                        )}
                      </div>
                      {user.bio && (
                        <p className="text-sm text-zinc-500 truncate">{user.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="flex items-center gap-2">
                    <ActiveIcon className={`w-5 h-5 ${activeCat?.color}`} />
                    <span className="text-xl font-bold text-white">{getValue(user)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="mt-8 text-center">
        <p className="text-zinc-400 mb-4">Want to climb the leaderboard?</p>
        <div className="flex justify-center gap-4">
          <Link to="/pods" className="btn-primary">
            Join Pods
          </Link>
          <Link to="/analytics" className="btn-ghost">
            View Your Stats
          </Link>
        </div>
      </div>
    </section>
  )
}
