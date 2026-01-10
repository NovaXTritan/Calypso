// NewThread.jsx - Create a new discussion thread in a pod
import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import { ArrowLeft, Send, AlertCircle } from 'lucide-react'
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

export default function NewThread() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const podName = PODS_DATA[slug] || slug

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim()) {
      setError('Please enter a title for your discussion')
      return
    }

    if (!content.trim()) {
      setError('Please enter some content for your discussion')
      return
    }

    if (!currentUser?.uid) {
      setError('Please sign in to create a discussion')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Create the thread document
      const threadRef = await addDoc(collection(db, 'threads'), {
        podSlug: slug,
        title: title.trim(),
        content: content.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorAvatar: currentUser.photoURL || null,
        postCount: 1, // Initial post is the thread content
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      // Create the first post (the thread content)
      await addDoc(collection(db, 'thread_posts'), {
        threadId: threadRef.id,
        podSlug: slug,
        content: content.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorAvatar: currentUser.photoURL || null,
        isOriginalPost: true,
        createdAt: Date.now()
      })

      toast.success('Discussion created!')
      navigate(`/pods/${slug}/thread/${threadRef.id}`)
    } catch (err) {
      trackError(err, { action: 'createThread', slug, userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      setError('Failed to create discussion. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="glass p-8 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Sign in required</h2>
          <p className="text-zinc-400 mb-4">You need to be signed in to create discussions.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        to={`/pods/${slug}`}
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to {podName}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Start a Discussion</h1>
        <p className="text-zinc-400">Share your thoughts, ask questions, or start a conversation in {podName}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-2">
            Discussion Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to discuss?"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-brand-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none transition"
            maxLength={200}
            disabled={submitting}
          />
          <p className="mt-1 text-xs text-zinc-500">{title.length}/200 characters</p>
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-zinc-300 mb-2">
            Your Message
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts, provide context, or ask a specific question..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-brand-500 rounded-xl text-white placeholder-zinc-500 focus:outline-none transition min-h-[200px] resize-y"
            maxLength={5000}
            disabled={submitting}
          />
          <p className="mt-1 text-xs text-zinc-500">{content.length}/5000 characters</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to={`/pods/${slug}`}
            className="px-6 py-3 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
          >
            <Send className="w-5 h-5" />
            {submitting ? 'Creating...' : 'Create Discussion'}
          </button>
        </div>
      </form>
    </div>
  )
}
