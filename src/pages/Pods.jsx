import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { pods as defaultPods, slugify } from '../podsData'
import { useForum } from '../storeForum'
import { useAuth } from '../contexts/AuthContext'
import SEO from '../components/SEO'
import RevealOnScroll from '../components/RevealOnScroll'
import GlowCard from '../components/GlowCard'
import FloatingOrbs from '../components/FloatingOrbs'
import { db } from '../lib/firebase'
import { collection, query, getDocs, addDoc, deleteDoc, doc, where, orderBy, limit } from 'firebase/firestore'
import { firestoreOperation, getFirebaseErrorMessage } from '../utils/retry'
import {
  Users, TrendingUp, Flame, Plus, Search, X,
  Sparkles, ArrowRight, Crown, Trash2, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { isModerator as checkIsModerator } from '../config/constants'
import { getAllPodStats } from '../lib/podStats'

// Pod categories for filtering
const CATEGORIES = [
  { id: 'all', label: 'All Pods' },
  { id: 'tech', label: 'Technology' },
  { id: 'business', label: 'Business' },
  { id: 'science', label: 'Science' },
  { id: 'creative', label: 'Creative' },
  { id: 'custom', label: 'Community Created' }
]

// Category mapping for default pods
const POD_CATEGORIES = {
  'ai': 'tech', 'data-science': 'tech', 'computer-science': 'tech', 'cybersecurity': 'tech',
  'cloud-devops': 'tech', 'blockchain': 'tech', 'game-development': 'tech', 'robotics': 'tech',
  'ux-ui-design': 'creative', 'music-audio': 'creative', 'literary': 'creative',
  'entrepreneurship': 'business', 'consulting': 'business', 'finance': 'business',
  'analytics': 'business', 'marketing': 'business', 'product-management': 'business',
  'astrophysics': 'science', 'psychology': 'science', 'neuroeconomics': 'science',
  'economics': 'science', 'statistics-risk-actuary': 'science', 'cosmology': 'science',
  'biotech': 'science', 'healthcare': 'science', 'climate-tech': 'science', 'mathematics': 'science'
}

export default function Pods() {
  const { currentUser } = useAuth()
  const membership = useForum(s => s.membership)
  const join = useForum(s => s.joinPod)
  const leave = useForum(s => s.leavePod)

  const [podStats, setPodStats] = useState({})
  const [customPods, setCustomPods] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPodName, setNewPodName] = useState('')
  const [newPodDescription, setNewPodDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const isModeratorUser = checkIsModerator(currentUser?.email)

  // Fetch pod stats from aggregated collection (OPTIMIZED: ~35 reads instead of 2000)
  useEffect(() => {
    const CACHE_KEY = 'cosmos_pod_stats'
    const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    const fetchData = async () => {
      try {
        // Try to use cached stats first
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { stats: cachedStats, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_DURATION) {
            setPodStats(cachedStats)
            // Continue to fetch custom pods and fresh stats in background
          }
        }

        // Fetch aggregated stats (one doc per pod = ~35 reads)
        const statsSnapshot = await firestoreOperation(
          () => getDocs(collection(db, 'podStatsAggregated')),
          { operation: 'Get pod stats' }
        )

        const stats = {}
        statsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          stats[data.podSlug || doc.id] = {
            members: data.members || 0,
            totalProofs: data.totalProofs || 0,
            weeklyProofs: data.weeklyProofs || 0
          }
        })

        // Ensure all default pods have stats (even if 0)
        defaultPods.forEach(name => {
          const slug = slugify(name)
          if (!stats[slug]) {
            stats[slug] = { members: 0, totalProofs: 0, weeklyProofs: 0 }
          }
        })

        setPodStats(stats)

        // Cache the stats
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          stats,
          timestamp: Date.now()
        }))

        // Fetch custom pods (typically small collection)
        const customPodsSnapshot = await firestoreOperation(
          () => getDocs(query(collection(db, 'customPods'), limit(100))),
          { operation: 'Get custom pods' }
        )
        const customPodsData = customPodsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isCustom: true
        }))

        // Add stats for custom pods from aggregated collection
        customPodsData.forEach(pod => {
          if (!stats[pod.slug]) {
            stats[pod.slug] = { members: 0, totalProofs: 0, weeklyProofs: 0 }
          }
        })

        setCustomPods(customPodsData)
        setPodStats(stats)
      } catch (error) {
        console.error('Error fetching pod data:', error)
        toast.error(getFirebaseErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Create custom pod
  const handleCreatePod = async (e) => {
    e.preventDefault()
    if (!newPodName.trim()) return

    setIsCreating(true)
    try {
      const slug = slugify(newPodName.trim())

      // Check if pod already exists
      const existingDefault = defaultPods.find(p => slugify(p) === slug)
      const existingCustom = customPods.find(p => p.slug === slug)

      if (existingDefault || existingCustom) {
        toast.error('A pod with this name already exists')
        return
      }

      const newPod = {
        name: newPodName.trim(),
        slug: slug,
        description: newPodDescription.trim() || 'A community for learning and growing together',
        createdBy: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: Date.now(),
        isCustom: true
      }

      const docRef = await addDoc(collection(db, 'customPods'), newPod)
      setCustomPods([...customPods, { id: docRef.id, ...newPod }])

      // Auto-join the created pod
      join(slug)

      toast.success('Pod created successfully!')
      setShowCreateModal(false)
      setNewPodName('')
      setNewPodDescription('')
    } catch (error) {
      console.error('Error creating pod:', error)
      toast.error('Failed to create pod')
    } finally {
      setIsCreating(false)
    }
  }

  // Delete custom pod (moderator only)
  const handleDeletePod = async (podId, podSlug) => {
    if (!isModeratorUser) return

    if (!confirm('Are you sure you want to delete this pod? This cannot be undone.')) return

    try {
      await deleteDoc(doc(db, 'customPods', podId))
      setCustomPods(customPods.filter(p => p.id !== podId))
      toast.success('Pod deleted')
    } catch (error) {
      console.error('Error deleting pod:', error)
      toast.error('Failed to delete pod')
    }
  }

  // Combine default and custom pods
  const allPods = [
    ...defaultPods.map(name => ({
      name,
      slug: slugify(name),
      isCustom: false,
      category: POD_CATEGORIES[slugify(name)] || 'other'
    })),
    ...customPods.map(pod => ({
      ...pod,
      category: 'custom'
    }))
  ]

  // Filter pods
  const filteredPods = allPods.filter(pod => {
    const matchesSearch = pod.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || pod.category === activeCategory ||
      (activeCategory === 'custom' && pod.isCustom)
    return matchesSearch && matchesCategory
  })

  // Separate joined and available pods
  const joinedPods = useMemo(() => filteredPods.filter(pod =>
    membership.has?.(pod.slug) || (membership instanceof Set && membership.has(pod.slug))
  ), [filteredPods, membership])

  const availablePods = useMemo(() => filteredPods.filter(pod =>
    !(membership.has?.(pod.slug) || (membership instanceof Set && membership.has(pod.slug)))
  ), [filteredPods, membership])

  // Memoized callbacks for pod actions
  const handleJoin = useCallback((slug) => join(slug), [join])
  const handleLeave = useCallback((slug) => leave(slug), [leave])

  return (
    <div className="relative min-h-screen">
      <SEO
        title="Learning Pods"
        description="Join focused learning communities. Share proofs, get feedback, and grow with like-minded learners."
        path="/pods"
      />

      <FloatingOrbs />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <RevealOnScroll>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Learning Pods</h1>
              <p className="text-zinc-400 text-lg">
                Join communities, share progress, grow together
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 self-start md:self-auto"
            >
              <Plus className="w-5 h-5" />
              Create Pod
            </button>
          </div>
        </RevealOnScroll>

        {/* Search and Filters */}
        <RevealOnScroll delay={100}>
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pods..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeCategory === cat.id
                      ? 'bg-brand-500 text-white'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Moderator Badge */}
        {isModeratorUser && (
          <RevealOnScroll delay={150}>
            <div className="mb-6 flex items-center gap-2 px-4 py-2 bg-glow-500/10 border border-glow-500/20 rounded-lg w-fit">
              <Crown className="w-5 h-5 text-glow-500" />
              <span className="text-glow-500 font-medium">Moderator Mode</span>
            </div>
          </RevealOnScroll>
        )}

        {/* Your Pods Section */}
        {joinedPods.length > 0 && (
          <RevealOnScroll delay={200}>
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-400" />
                Your Pods ({joinedPods.length})
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {joinedPods.map((pod, index) => (
                  <PodCard
                    key={pod.slug}
                    pod={pod}
                    stats={podStats[pod.slug]}
                    loading={loading}
                    isMember={true}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    isModerator={isModeratorUser}
                    onDelete={pod.isCustom ? () => handleDeletePod(pod.id, pod.slug) : null}
                    delay={index * 50}
                  />
                ))}
              </div>
            </div>
          </RevealOnScroll>
        )}

        {/* Explore Pods Section */}
        <RevealOnScroll delay={joinedPods.length > 0 ? 300 : 200}>
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              {joinedPods.length > 0 ? 'Explore More Pods' : 'All Pods'} ({availablePods.length})
            </h2>

            {availablePods.length === 0 ? (
              <div className="glass p-8 rounded-xl text-center">
                <p className="text-zinc-400">
                  {searchQuery ? 'No pods match your search' : 'You\'ve joined all available pods!'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availablePods.map((pod, index) => (
                  <PodCard
                    key={pod.slug}
                    pod={pod}
                    stats={podStats[pod.slug]}
                    loading={loading}
                    isMember={false}
                    onJoin={handleJoin}
                    onLeave={handleLeave}
                    isModerator={isModeratorUser}
                    onDelete={pod.isCustom ? () => handleDeletePod(pod.id, pod.slug) : null}
                    delay={index * 50}
                  />
                ))}
              </div>
            )}
          </div>
        </RevealOnScroll>
      </div>

      {/* Create Pod Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-night-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create New Pod</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePod} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Pod Name *
                </label>
                <input
                  type="text"
                  value={newPodName}
                  onChange={(e) => setNewPodName(e.target.value)}
                  placeholder="e.g., Machine Learning"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition"
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newPodDescription}
                  onChange={(e) => setNewPodDescription(e.target.value)}
                  placeholder="What's this pod about?"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition resize-none h-24"
                  maxLength={200}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-white/10 rounded-lg hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newPodName.trim()}
                  className="flex-1 btn-primary justify-center disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Pod'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// Pod Card Component - Memoized for performance
const PodCard = memo(function PodCard({ pod, stats, loading, isMember, onJoin, onLeave, isModerator, onDelete, delay = 0 }) {
  const podStats = stats || { members: 0, totalProofs: 0, weeklyProofs: 0 }

  // Use callbacks that pass the slug
  const handleJoin = useCallback(() => onJoin(pod.slug), [onJoin, pod.slug])
  const handleLeave = useCallback(() => onLeave(pod.slug), [onLeave, pod.slug])

  return (
    <RevealOnScroll delay={delay}>
      <GlowCard className={`flex flex-col h-full ${isMember ? 'ring-2 ring-brand-500/30' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-white truncate">{pod.name}</h3>
              {pod.isCustom && (
                <span className="px-2 py-0.5 bg-purple-500/20 rounded-full text-xs text-purple-300">
                  Community
                </span>
              )}
            </div>
            {isMember && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-brand-500/20 rounded-full text-xs text-brand-400">
                Joined
              </span>
            )}
          </div>

          {isModerator && onDelete && (
            <button
              onClick={onDelete}
              className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition"
              title="Delete pod"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-sm text-zinc-400 mb-4 flex-1 line-clamp-2">
          {pod.description || 'A community for learning and growing together'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 py-3 border-y border-white/10">
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="w-4 h-4 text-brand-400" />
            <span className="text-white font-medium">
              {loading ? '-' : podStats.members}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <TrendingUp className="w-4 h-4 text-glow-500" />
            <span className="text-white font-medium">
              {loading ? '-' : podStats.totalProofs}
            </span>
          </div>
          {podStats.weeklyProofs > 0 && (
            <div className="flex items-center gap-1 text-sm text-orange-400">
              <Flame className="w-3 h-3" />
              <span>{podStats.weeklyProofs}/wk</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            to={`/pods/${pod.slug}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg transition text-zinc-300 hover:text-white"
          >
            Open
            <ArrowRight className="w-4 h-4" />
          </Link>

          {isMember ? (
            <button
              onClick={handleLeave}
              className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition text-zinc-400"
            >
              Leave
            </button>
          ) : (
            <button
              onClick={handleJoin}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-lg transition text-white font-medium"
            >
              Join
            </button>
          )}
        </div>
      </GlowCard>
    </RevealOnScroll>
  )
})
