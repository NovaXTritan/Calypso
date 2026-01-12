import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { firestoreOperation, getFirebaseErrorMessage } from '../utils/retry'
import { Users, Target, Zap, MessageCircle, Sparkles, Search, Filter, TrendingUp, Heart, UserPlus, ChevronRight, Flame, Award, Clock, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Avatar from '../components/Avatar'
import { getOrCreateConversation, subscribeToConversations } from '../lib/chat'
import { calculateMatches, getMatchReason, getMatchQuality } from '../lib/matching'
import toast from 'react-hot-toast'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

export default function Matches(){
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterPod, setFilterPod] = useState('all')
  const [filterGoal, setFilterGoal] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [availablePods, setAvailablePods] = useState([])
  const [availableGoals, setAvailableGoals] = useState([])
  const [conversations, setConversations] = useState([])
  const [startingChat, setStartingChat] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedUser, setSelectedUser] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Animation config based on reduced motion
  const animateCard = useMemo(() => prefersReducedMotion ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 }
  }, [prefersReducedMotion])

  const staggerDelay = useCallback((index) =>
    prefersReducedMotion ? 0 : Math.min(index * 0.05, 0.3)
  , [prefersReducedMotion])

  // Calculate matching stats
  const matchStats = useMemo(() => {
    if (users.length === 0) return null

    const highMatches = users.filter(u => u.matchScore >= 80).length
    const mediumMatches = users.filter(u => u.matchScore >= 50 && u.matchScore < 80).length
    const activeMatches = users.filter(u => u.recentActivity > 0).length

    // Most common shared pod
    const podCounts = {}
    users.forEach(u => {
      (u.commonPods || []).forEach(pod => {
        podCounts[pod] = (podCounts[pod] || 0) + 1
      })
    })
    const topPod = Object.entries(podCounts).sort((a, b) => b[1] - a[1])[0]

    return {
      total: users.length,
      highMatches,
      mediumMatches,
      activeMatches,
      topPod: topPod ? topPod[0] : null
    }
  }, [users])

  // Subscribe to existing conversations
  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribe = subscribeToConversations(currentUser.uid, (convs) => {
      setConversations(convs)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  // Check if already chatting with a user
  function getExistingConversation(userId) {
    return conversations.find(conv =>
      conv.participants.includes(userId)
    )
  }

  useEffect(() => {
    fetchUsers()
  }, [currentUser])

  useEffect(() => {
    applyFilters()
  }, [users, filterPod, filterGoal, searchQuery])

  async function fetchUsers() {
    if (!currentUser) return

    try {
      // Fetch all users (with limit for large databases)
      const usersSnapshot = await firestoreOperation(
        () => getDocs(query(collection(db, 'users'), limit(500))),
        { operation: 'Fetch users' }
      )
      const allUsers = usersSnapshot.docs
        .filter(doc => doc.id !== currentUser.uid)
        .map(doc => ({ id: doc.id, ...doc.data() }))

      // Fetch proofs to calculate activity (with limit)
      const postsSnapshot = await firestoreOperation(
        () => getDocs(query(collection(db, 'proofs'), limit(500))),
        { operation: 'Fetch proofs' }
      )
      const allPosts = postsSnapshot.docs.map(doc => doc.data())

      // Use the sophisticated matching algorithm
      const matchedUsers = calculateMatches(currentUser, allUsers, allPosts)
      setUsers(matchedUsers)

      // Extract unique pods and goals for filters
      const pods = new Set()
      const goals = new Set()
      matchedUsers.forEach(user => {
        (user.joinedPods || []).forEach(pod => pods.add(pod))
        ;(user.goals || []).forEach(goal => goals.add(goal))
      })
      setAvailablePods(Array.from(pods))
      setAvailableGoals(Array.from(goals))

    } catch (error) {
      trackError(error, { action: 'fetchMatches', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error(getFirebaseErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...users]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(user =>
        user.displayName?.toLowerCase().includes(query) ||
        user.bio?.toLowerCase().includes(query) ||
        (user.goals || []).some(g => g.toLowerCase().includes(query)) ||
        (user.joinedPods || []).some(p => p.toLowerCase().includes(query))
      )
    }

    if (filterPod !== 'all') {
      filtered = filtered.filter(user =>
        (user.joinedPods || []).includes(filterPod)
      )
    }

    if (filterGoal !== 'all') {
      filtered = filtered.filter(user =>
        (user.goals || []).some(g => g.toLowerCase().includes(filterGoal.toLowerCase()))
      )
    }

    setFilteredUsers(filtered)
  }

  // Clear all filters
  function clearFilters() {
    setFilterPod('all')
    setFilterGoal('all')
    setSearchQuery('')
  }

  // Get compatibility breakdown
  function getCompatibilityBreakdown(user) {
    const breakdown = []

    if (user.commonPods?.length > 0) {
      breakdown.push({ label: 'Shared Pods', value: user.commonPods.length, icon: Users, color: 'text-brand-400' })
    }
    if (user.commonGoals?.length > 0) {
      breakdown.push({ label: 'Shared Goals', value: user.commonGoals.length, icon: Target, color: 'text-green-400' })
    }
    if (user.recentActivity > 0) {
      breakdown.push({ label: 'Activity Score', value: user.recentActivity, icon: Zap, color: 'text-yellow-400' })
    }
    if (user.streak > 0) {
      breakdown.push({ label: 'Streak', value: user.streak, icon: Flame, color: 'text-orange-400' })
    }

    return breakdown
  }

  async function startChat(user) {
    setStartingChat(user.uid)
    try {
      const conversation = await getOrCreateConversation(currentUser, user)
      navigate(`/chat/${conversation.id}`)
    } catch (error) {
      trackError(error, { action: 'startChat', userId: currentUser?.uid, targetUserId: user?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to start chat')
    } finally {
      setStartingChat(null)
    }
  }

  function openExistingChat(conversationId) {
    navigate(`/chat/${conversationId}`)
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Finding your best matches...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-400" />
            Discover Peers
          </h2>
          <p className="text-zinc-400 mt-1">Find accountability partners with similar goals</p>
        </div>
        {matchStats && (
          <div className="flex items-center gap-2 px-4 py-2 bg-brand-500/20 rounded-xl">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-medium text-brand-400">{matchStats.highMatches} great matches</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      {matchStats && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
        >
          <div className="glass p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-white">{matchStats.total}</div>
            <div className="text-xs text-zinc-400">Total Matches</div>
          </div>
          <div className="glass p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-400">{matchStats.highMatches}</div>
            <div className="text-xs text-zinc-400">High Compatibility</div>
          </div>
          <div className="glass p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-yellow-400">{matchStats.activeMatches}</div>
            <div className="text-xs text-zinc-400">Active This Week</div>
          </div>
          <div className="glass p-4 rounded-xl text-center">
            <div className="text-2xl font-bold text-brand-400">{conversations.length}</div>
            <div className="text-xs text-zinc-400">Conversations</div>
          </div>
        </motion.div>
      )}

      {/* Search and Filters */}
      <div className="glass p-4 rounded-2xl mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, goal, or pod..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
              showFilters || filterPod !== 'all' || filterGoal !== 'all'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
            {(filterPod !== 'all' || filterGoal !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-brand-400" />
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Filter by Pod</label>
                  <select
                    value={filterPod}
                    onChange={(e) => setFilterPod(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                  >
                    <option value="all">All Pods</option>
                    {availablePods.map(pod => (
                      <option key={pod} value={pod}>{pod}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Filter by Goal</label>
                  <select
                    value={filterGoal}
                    onChange={(e) => setFilterGoal(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                  >
                    <option value="all">All Goals</option>
                    {availableGoals.map(goal => (
                      <option key={goal} value={goal}>{goal}</option>
                    ))}
                  </select>
                </div>
              </div>

              {(filterPod !== 'all' || filterGoal !== 'all' || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-xs text-brand-400 hover:text-brand-300"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-400">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'match' : 'matches'} found
          {(filterPod !== 'all' || filterGoal !== 'all' || searchQuery) && ' (filtered)'}
        </p>
      </div>

      {/* User Cards */}
      {filteredUsers.length === 0 ? (
        <div className="glass p-8 rounded-2xl text-center">
          <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-2">No matches found</p>
          <p className="text-sm text-zinc-500">Try adjusting your filters or join more pods!</p>
          {(filterPod !== 'all' || filterGoal !== 'all' || searchQuery) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-brand-400 hover:text-brand-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass p-5 rounded-2xl hover:border-brand-500/30 transition-colors group"
            >
              {/* Match Score Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar user={user} />
                    {user.recentActivity > 0 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-night-900" title="Active this week" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{user.displayName || 'Anonymous'}</div>
                    <div className="text-xs text-zinc-400">
                      {getMatchReason(user)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                    user.matchScore >= 80 ? 'bg-green-500/20' : user.matchScore >= 50 ? 'bg-brand-400/20' : 'bg-white/10'
                  }`}>
                    <Sparkles size={14} className={user.matchScore >= 80 ? 'text-green-400' : user.matchScore >= 50 ? 'text-brand-400' : 'text-zinc-400'} />
                    <span className={`text-sm font-semibold ${user.matchScore >= 80 ? 'text-green-400' : user.matchScore >= 50 ? 'text-brand-400' : 'text-zinc-400'}`}>
                      {user.matchScore}%
                    </span>
                  </div>
                  <span className={`text-[10px] ${getMatchQuality(user.matchScore).color}`}>
                    {getMatchQuality(user.matchScore).label}
                  </span>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-sm text-zinc-300 mb-3 line-clamp-2">{user.bio}</p>
              )}

              {/* Compatibility Breakdown */}
              {(() => {
                const breakdown = getCompatibilityBreakdown(user)
                if (breakdown.length > 0) {
                  return (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {breakdown.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          <item.icon size={12} className={item.color} />
                          <span className="text-zinc-400">{item.label}:</span>
                          <span className="text-white font-medium">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              })()}

              {/* Common Pods */}
              {user.commonPods && user.commonPods.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {user.commonPods.slice(0, 3).map(pod => (
                      <span
                        key={pod}
                        className="px-2 py-1 rounded-md bg-brand-500/10 text-xs text-brand-400 border border-brand-500/20"
                      >
                        {pod}
                      </span>
                    ))}
                    {user.commonPods.length > 3 && (
                      <span className="px-2 py-1 text-xs text-zinc-400">
                        +{user.commonPods.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Common Goals */}
              {user.commonGoals && user.commonGoals.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {user.commonGoals.slice(0, 2).map((goal, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-white/5 text-xs text-zinc-300"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Button */}
              {(() => {
                const existingConv = getExistingConversation(user.uid)
                if (existingConv) {
                  return (
                    <button
                      onClick={() => openExistingChat(existingConv.id)}
                      className="w-full flex items-center justify-center gap-2 btn-ghost py-2.5 text-sm group-hover:bg-white/10"
                    >
                      <MessageCircle size={14} />
                      Continue Chat
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )
                }
                return (
                  <button
                    onClick={() => startChat(user)}
                    disabled={startingChat === user.uid}
                    className="w-full flex items-center justify-center gap-2 btn-primary py-2.5 text-sm disabled:opacity-50"
                  >
                    {startingChat === user.uid ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        Connect
                      </>
                    )}
                  </button>
                )
              })()}
            </motion.div>
          ))}
        </div>
      )}

      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-4">Recent Chats</h3>
          <div className="space-y-2">
            {conversations.slice(0, 5).map(conv => {
              const otherId = conv.participants.find(id => id !== currentUser.uid)
              const other = conv.participantData?.[otherId]

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full flex items-center gap-3 p-4 glass rounded-xl hover:bg-white/10 transition text-left"
                >
                  <Avatar
                    user={{ photoURL: other?.photoURL, displayName: other?.name }}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{other?.name || 'User'}</div>
                    {conv.lastMessage && (
                      <p className="text-sm text-zinc-400 truncate">
                        {conv.lastMessage.senderId === currentUser.uid ? 'You: ' : ''}
                        {conv.lastMessage.text}
                      </p>
                    )}
                  </div>
                  <MessageCircle size={18} className="text-zinc-400" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
