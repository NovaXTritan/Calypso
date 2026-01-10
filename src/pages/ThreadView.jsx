// ThreadView.jsx - View and participate in a discussion thread
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  increment
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Clock,
  AlertCircle,
  RefreshCw,
  User
} from 'lucide-react'
import toast from 'react-hot-toast'

// Pod data for display
const PODS_DATA = {
  'dsa': 'DSA & Algorithms',
  'webdev': 'Web Development',
  'ai-ml': 'AI & Machine Learning',
  'placement': 'Placement Prep',
  'open-source': 'Open Source',
  'entrepreneurship': 'Entrepreneurship'
}

// Format relative time
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

// Loading skeleton for posts
const PostSkeleton = () => (
  <div className="glass p-5 rounded-xl animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-zinc-700" />
      <div className="space-y-2">
        <div className="h-4 w-24 bg-zinc-700 rounded" />
        <div className="h-3 w-16 bg-zinc-800 rounded" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full bg-zinc-800 rounded" />
      <div className="h-4 w-3/4 bg-zinc-800 rounded" />
    </div>
  </div>
)

export default function ThreadView() {
  const { slug, threadId } = useParams()
  const { currentUser } = useAuth()

  const [thread, setThread] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const podName = PODS_DATA[slug] || slug

  // Fetch thread data
  useEffect(() => {
    if (!threadId) return

    const fetchThread = async () => {
      try {
        const threadDoc = await getDoc(doc(db, 'threads', threadId))
        if (threadDoc.exists()) {
          setThread({ id: threadDoc.id, ...threadDoc.data() })
        } else {
          setError('Thread not found')
        }
      } catch (err) {
        trackError(err, { action: 'fetchThread', threadId }, 'error', ErrorCategory.FIRESTORE)
        setError('Failed to load thread')
      }
    }

    fetchThread()
  }, [threadId])

  // Subscribe to posts
  useEffect(() => {
    if (!threadId) return

    setLoading(true)

    const postsQuery = query(
      collection(db, 'thread_posts'),
      where('threadId', '==', threadId),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        setLoading(false)
      },
      (err) => {
        trackError(err, { action: 'fetchPosts', threadId }, 'error', ErrorCategory.FIRESTORE)
        setError('Failed to load replies')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [threadId])

  // Handle reply submission
  const handleReply = useCallback(async (e) => {
    e.preventDefault()

    if (!replyContent.trim()) return

    if (!currentUser?.uid) {
      toast.error('Please sign in to reply')
      return
    }

    setSubmitting(true)

    try {
      // Add the reply
      await addDoc(collection(db, 'thread_posts'), {
        threadId: threadId,
        podSlug: slug,
        content: replyContent.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorAvatar: currentUser.photoURL || null,
        isOriginalPost: false,
        createdAt: Date.now()
      })

      // Update thread's post count and updatedAt
      await updateDoc(doc(db, 'threads', threadId), {
        postCount: increment(1),
        updatedAt: Date.now()
      })

      setReplyContent('')
      toast.success('Reply posted!')
    } catch (err) {
      trackError(err, { action: 'postReply', threadId, userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }, [replyContent, currentUser, threadId, slug])

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          to={`/pods/${slug}`}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to {podName}
        </Link>

        <div className="glass p-8 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        to={`/pods/${slug}`}
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to {podName}
      </Link>

      {/* Thread Header */}
      {thread ? (
        <div className="glass p-6 rounded-2xl mb-6">
          <h1 className="text-2xl font-bold text-white mb-3">{thread.title}</h1>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              {thread.authorAvatar ? (
                <img
                  src={thread.authorAvatar}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 flex items-center justify-center text-xs text-white font-medium">
                  {thread.authorName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <span className="text-zinc-300">{thread.authorName || 'Anonymous'}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatTime(thread.createdAt)}
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {thread.postCount || 1} {thread.postCount === 1 ? 'reply' : 'replies'}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass p-6 rounded-2xl mb-6 animate-pulse">
          <div className="h-8 w-2/3 bg-zinc-700 rounded mb-3" />
          <div className="h-4 w-1/2 bg-zinc-800 rounded" />
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4 mb-8">
        {loading ? (
          <>
            <PostSkeleton />
            <PostSkeleton />
          </>
        ) : posts.length === 0 ? (
          <div className="glass p-6 rounded-xl text-center text-zinc-400">
            No posts yet. Be the first to reply!
          </div>
        ) : (
          posts.map((post, index) => (
            <div
              key={post.id}
              className={`glass p-5 rounded-xl ${post.isOriginalPost ? 'border-2 border-brand-500/30' : ''}`}
            >
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-3">
                {post.authorAvatar ? (
                  <img
                    src={post.authorAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 flex items-center justify-center text-white font-medium">
                    {post.authorName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{post.authorName || 'Anonymous'}</span>
                    {post.isOriginalPost && (
                      <span className="px-2 py-0.5 bg-brand-500/20 rounded-full text-xs text-brand-400">
                        OP
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-zinc-500">{formatTime(post.createdAt)}</span>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Reply Form */}
      {currentUser ? (
        <div className="glass p-5 rounded-xl">
          <h3 className="font-medium text-white mb-3">Reply to this discussion</h3>
          <form onSubmit={handleReply}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-brand-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none transition min-h-[120px] resize-y mb-3"
              maxLength={2000}
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{replyContent.length}/2000</span>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="glass p-5 rounded-xl text-center">
          <p className="text-zinc-400 mb-3">Sign in to join the discussion</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      )}
    </div>
  )
}
