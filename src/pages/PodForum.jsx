// PodForum.jsx - Clean Pod page with activity feed
import React, { useState, useEffect, useCallback, memo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Plus,
  Clock,
  Flame,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import Composer from "../components/Composer"
import ProofCard from '../components/ProofCard'

// ============================================
// POD DATA
// ============================================

const PODS_DATA = [
  { slug: 'dsa', name: 'DSA & Algorithms', description: 'Data structures and algorithmic problem solving' },
  { slug: 'webdev', name: 'Web Development', description: 'Frontend, backend, and full-stack development' },
  { slug: 'ai-ml', name: 'AI & Machine Learning', description: 'Artificial intelligence and machine learning' },
  { slug: 'placement', name: 'Placement Prep', description: 'Interview preparation and career guidance' },
  { slug: 'open-source', name: 'Open Source', description: 'Contributing to open source projects' },
  { slug: 'entrepreneurship', name: 'Entrepreneurship', description: 'A community for learning and growing together' }
]

// ============================================
// SAFE UTILITIES
// ============================================

const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  try { return String(value) } catch { return fallback }
}

const safeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && !isNaN(value)) return value
  const parsed = Number(value)
  return isNaN(parsed) ? fallback : parsed
}

const safeArray = (value) => Array.isArray(value) ? value : []

// ============================================
// ERROR BOUNDARY
// ============================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('PodForum Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="glass p-8 rounded-xl text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
            <p className="text-zinc-400 mb-4">We couldn't load this page properly.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================
// LOADING SKELETON
// ============================================

const LoadingSkeleton = memo(() => (
  <div className="space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i} className="glass p-5 rounded-xl animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-full bg-zinc-700" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-zinc-700 rounded" />
            <div className="h-3 w-24 bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="h-24 bg-zinc-800 rounded" />
      </div>
    ))}
  </div>
))

// ============================================
// EMPTY STATE
// ============================================

const EmptyState = memo(({ isMember, podName }) => (
  <div className="glass p-8 rounded-xl text-center">
    <p className="text-zinc-400 mb-2">No proofs in this pod yet</p>
    <p className="text-sm text-zinc-500">
      {isMember 
        ? 'Be the first to share your progress!' 
        : `Join ${podName || 'this pod'} to start sharing`}
    </p>
  </div>
))

// ============================================
// ERROR STATE
// ============================================

const ErrorState = memo(({ message, onRetry }) => (
  <div className="glass p-6 rounded-xl border border-red-500/20">
    <div className="flex items-center gap-3 mb-4">
      <AlertCircle className="w-6 h-6 text-red-400" />
      <h3 className="font-semibold text-white">Error Loading Content</h3>
    </div>
    <p className="text-zinc-400 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    )}
  </div>
))

// ============================================
// MAIN COMPONENT
// ============================================

function PodForumContent() {
  const { slug } = useParams()
  
  // Get auth - uses currentUser (not user!)
  const { currentUser, updateUserProfile } = useAuth()

  const [view, setView] = useState('feed')
  const [proofs, setProofs] = useState([])
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('recent')
  const [podStats, setPodStats] = useState({ members: 0, proofs: 0, activeToday: 0 })
  const [membershipLoading, setMembershipLoading] = useState(false)

  // Find pod from local data
  const pod = PODS_DATA.find(p => p.slug === slug) || { 
    name: slug?.charAt(0).toUpperCase() + slug?.slice(1) || 'Pod', 
    slug,
    description: 'A community for learning and growing together'
  }

  // Check membership from currentUser's joinedPods
  const userPods = safeArray(currentUser?.joinedPods)
  const isMember = userPods.includes(slug)

  // Fetch proofs
  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe = () => {}

    try {
      const proofsQuery = query(
        collection(db, 'proofs'),
        where('podSlug', '==', slug),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )

      unsubscribe = onSnapshot(
        proofsQuery, 
        (snapshot) => {
          try {
            const proofsData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            
            setProofs(proofsData)
            
            // Calculate stats safely
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayTimestamp = today.getTime()
            
            const uniqueAuthors = new Set(
              proofsData.map(p => safeString(p?.authorId)).filter(Boolean)
            )
            const todayProofs = proofsData.filter(p => 
              safeNumber(p?.createdAt, 0) >= todayTimestamp
            )
            
            setPodStats(prev => ({
              ...prev,
              proofs: proofsData.length,
              activeToday: todayProofs.length,
              members: Math.max(prev.members, uniqueAuthors.size)
            }))
            
            setLoading(false)
            setError(null)
          } catch (err) {
            console.error('Error processing proofs:', err)
            setError('Failed to process activity data')
            setLoading(false)
          }
        },
        (err) => {
          console.error('Firestore error:', err)
          
          if (err?.code === 'failed-precondition') {
            setError('Database indexes are being built. Please try again in a few minutes.')
          } else if (err?.code === 'permission-denied') {
            setError('You don\'t have permission to view this content.')
          } else {
            setError('Failed to load activity. Please try again.')
          }
          
          setLoading(false)
        }
      )
    } catch (err) {
      console.error('Query setup error:', err)
      setError('Failed to connect to database')
      setLoading(false)
    }

    return () => {
      try { unsubscribe() } catch {}
    }
  }, [slug])

  // Fetch threads
  useEffect(() => {
    if (!slug || view !== 'threads') return

    let unsubscribe = () => {}

    try {
      const threadsQuery = query(
        collection(db, 'threads'),
        where('podSlug', '==', slug),
        orderBy('updatedAt', 'desc'),
        limit(20)
      )

      unsubscribe = onSnapshot(
        threadsQuery,
        (snapshot) => {
          setThreads(snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })))
        },
        (err) => {
          console.warn('Threads fetch error:', err)
        }
      )
    } catch (err) {
      console.warn('Threads query error:', err)
    }

    return () => {
      try { unsubscribe() } catch {}
    }
  }, [slug, view])

  // Sort proofs safely
  const sortedProofs = [...proofs].sort((a, b) => {
    try {
      if (sortBy === 'popular') {
        const aLikes = safeArray(a?.likes).length
        const bLikes = safeArray(b?.likes).length
        return bLikes - aLikes
      }
      return safeNumber(b?.createdAt, 0) - safeNumber(a?.createdAt, 0)
    } catch {
      return 0
    }
  })

  // Handle join/leave using updateUserProfile from AuthContext
  const handleJoinLeave = useCallback(async () => {
    if (!currentUser?.uid) {
      alert('Please sign in to join pods')
      return
    }

    setMembershipLoading(true)

    try {
      const currentPods = safeArray(currentUser?.joinedPods)
      let newPods
      
      if (isMember) {
        // Leave pod
        newPods = currentPods.filter(p => p !== slug)
      } else {
        // Join pod
        newPods = [...currentPods, slug]
      }
      
      // Update via AuthContext's updateUserProfile
      await updateUserProfile({ joinedPods: newPods })
      
    } catch (err) {
      console.error('Join/leave error:', err)
      alert('Failed to update membership. Please try again.')
    } finally {
      setMembershipLoading(false)
    }
  }, [isMember, slug, currentUser, updateUserProfile])

  // Retry handler
  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link 
        to="/pods" 
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Pods
      </Link>

      {/* Pod Header */}
      <div className="glass p-6 rounded-2xl mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {safeString(pod.name, 'Pod')}
            </h1>
            <p className="text-zinc-400">
              {pod.description || 'A community for learning and growing together'}
            </p>
          </div>
          
          <button
            onClick={handleJoinLeave}
            disabled={membershipLoading || !currentUser}
            className={`px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 ${
              isMember
                ? 'bg-zinc-700 hover:bg-zinc-600 text-white'
                : 'bg-brand-500 hover:bg-brand-600 text-white'
            }`}
          >
            {!currentUser ? 'Sign in to Join' : membershipLoading ? 'Loading...' : isMember ? 'Leave Pod' : 'Join Pod'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-1">
              <Users className="w-5 h-5 text-brand-400" />
              {podStats.members || '-'}
            </div>
            <p className="text-sm text-zinc-400">Members</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-1">
              <TrendingUp className="w-5 h-5 text-glow-400" />
              {podStats.proofs}
            </div>
            <p className="text-sm text-zinc-400">Proofs</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white mb-1">
              <Flame className="w-5 h-5 text-orange-400" />
              {podStats.activeToday}
            </div>
            <p className="text-sm text-zinc-400">Today</p>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setView('feed')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
            view === 'feed'
              ? 'bg-brand-500 text-white'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          Activity Feed
        </button>
        <button
          onClick={() => setView('threads')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
            view === 'threads'
              ? 'bg-brand-500 text-white'
              : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          Threads
        </button>
      </div>

      {/* Content */}
      {view === 'feed' ? (
        <div className="space-y-6">
          {/* Composer (only for members) */}
          {isMember && (
            <Composer 
              podSlug={slug} 
              podName={safeString(pod.name)}
              onSuccess={() => {}}
            />
          )}

          {/* Not a member prompt */}
          {!isMember && (
            <div className="glass p-6 rounded-xl text-center border border-dashed border-white/20">
              <p className="text-zinc-400 mb-3">
                {currentUser ? 'Join this pod to share your progress' : 'Sign in and join this pod to share your progress'}
              </p>
              <button
                onClick={handleJoinLeave}
                disabled={membershipLoading || !currentUser}
                className="px-6 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                {!currentUser ? 'Sign in to Join' : membershipLoading ? 'Loading...' : `Join ${safeString(pod.name, 'Pod')}`}
              </button>
            </div>
          )}

          {/* Error State */}
          {error && <ErrorState message={error} onRetry={handleRetry} />}

          {/* Sort Options */}
          {!error && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                {[
                  { key: 'recent', icon: Clock, label: 'Recent' },
                  { key: 'popular', icon: TrendingUp, label: 'Popular' }
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                      sortBy === key
                        ? 'bg-brand-500 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && <LoadingSkeleton />}

          {/* Empty State */}
          {!loading && !error && sortedProofs.length === 0 && (
            <EmptyState isMember={isMember} podName={safeString(pod.name)} />
          )}

          {/* Proofs Feed */}
          {!loading && !error && sortedProofs.length > 0 && (
            <div className="space-y-4">
              {sortedProofs.map(proof => (
                <ProofCard 
                  key={safeString(proof?.id, Math.random().toString())} 
                  proof={proof} 
                  currentUserId={currentUser?.uid}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Threads View */
        <div className="space-y-4">
          {isMember && (
            <Link
              to={`/pods/${slug}/new-thread`}
              className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-white/20 hover:border-brand-500/50 rounded-xl text-zinc-400 hover:text-white transition-all"
            >
              <Plus className="w-5 h-5" />
              Create New Thread
            </Link>
          )}

          {threads.length === 0 ? (
            <div className="glass p-8 rounded-xl text-center">
              <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No threads yet</p>
            </div>
          ) : (
            threads.map(thread => (
              <Link
                key={safeString(thread?.id, Math.random().toString())}
                to={`/pods/${slug}/thread/${safeString(thread?.id)}`}
                className="block glass p-5 rounded-xl hover:border-white/20 border border-transparent transition-all"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {safeString(thread?.title, 'Untitled Thread')}
                </h3>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>{safeNumber(thread?.postCount, 0)} posts</span>
                  <span>•</span>
                  <span>
                    {thread?.updatedAt 
                      ? new Date(thread.updatedAt).toLocaleDateString()
                      : 'Unknown date'}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// EXPORT WITH ERROR BOUNDARY
// ============================================

export default function PodForum() {
  return (
    <ErrorBoundary>
      <PodForumContent />
    </ErrorBoundary>
  )
}
