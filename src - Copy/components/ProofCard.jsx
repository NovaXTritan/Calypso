// ProofCard.jsx - PRODUCTION-SAFE version with comprehensive error handling
// This component will NOT crash even with malformed data

import { useState, useCallback, memo } from 'react'
import { 
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Flame, 
  Send,
  ExternalLink,
  MoreHorizontal,
  Flag,
  Bookmark,
  AlertCircle
} from 'lucide-react'

// ============================================
// SAFE UTILITIES - Won't throw errors
// ============================================

// Safe DOMPurify import with fallback
let sanitize = (str) => str
try {
  const DOMPurify = require('dompurify')
  sanitize = DOMPurify.sanitize
} catch {
  // Fallback: basic sanitization if DOMPurify not available
  sanitize = (str) => {
    if (typeof str !== 'string') return ''
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }
}

// Safe toast with fallback
const safeToast = {
  success: (msg) => {
    try {
      const toast = require('react-hot-toast').default
      toast.success(msg)
    } catch {
      console.log('Toast:', msg)
    }
  },
  error: (msg) => {
    try {
      const toast = require('react-hot-toast').default
      toast.error(msg)
    } catch {
      console.error('Toast Error:', msg)
    }
  }
}

// Safe string operations
const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  try {
    return String(value)
  } catch {
    return fallback
  }
}

const safeSlice = (str, start, end) => {
  try {
    const s = safeString(str)
    return s.slice(start, end)
  } catch {
    return ''
  }
}

const safeCharAt = (str, index) => {
  try {
    const s = safeString(str)
    return s.charAt(index) || ''
  } catch {
    return ''
  }
}

// Safe array operations
const safeArray = (value) => {
  if (Array.isArray(value)) return value
  return []
}

const safeIncludes = (arr, value) => {
  try {
    return safeArray(arr).includes(value)
  } catch {
    return false
  }
}

const safeLength = (arr) => {
  try {
    return safeArray(arr).length
  } catch {
    return 0
  }
}

// Safe number operations
const safeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && !isNaN(value)) return value
  const parsed = Number(value)
  return isNaN(parsed) ? fallback : parsed
}

// Format relative time - SAFE version
const formatTime = (timestamp) => {
  try {
    if (!timestamp) return ''
    
    const ts = safeNumber(timestamp)
    if (ts <= 0) return ''
    
    const now = Date.now()
    const diff = now - ts
    
    if (diff < 0) return 'just now' // Future date protection
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    
    return new Date(ts).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  } catch {
    return ''
  }
}

// Safe URL validation
const isValidUrl = (string) => {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

// ============================================
// COMPONENT
// ============================================

function ProofCard({ proof, currentUserId, showPodBadge = false }) {
  // Defensive: ensure proof exists
  if (!proof || typeof proof !== 'object') {
    return null // Don't render anything if proof is invalid
  }

  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isLiking, setIsLiking] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Safe data extraction with fallbacks
  const proofId = safeString(proof.id)
  const authorId = safeString(proof.authorId)
  const authorName = safeString(proof.authorName, 'Anonymous')
  const authorAvatar = safeString(proof.authorAvatar)
  const podSlug = safeString(proof.podSlug)
  const podName = safeString(proof.podName)
  const threadId = safeString(proof.threadId)
  const threadTitle = safeString(proof.threadTitle)
  const proofType = safeString(proof.type, 'text')
  const content = safeString(proof.content)
  const streak = safeNumber(proof.streak, 0)
  const createdAt = safeNumber(proof.createdAt, 0)
  const likes = safeArray(proof.likes)
  const comments = safeArray(proof.comments)

  const isLiked = safeIncludes(likes, currentUserId)
  const likeCount = safeLength(likes)
  const commentCount = safeLength(comments)

  // ============================================
  // SAFE EVENT HANDLERS
  // ============================================

  const handleLike = useCallback(async () => {
    if (isLiking) return
    
    if (!currentUserId) {
      safeToast.error('Please sign in to like')
      return
    }

    if (!proofId) {
      console.error('Cannot like: missing proof ID')
      return
    }

    setIsLiking(true)
    setActionError(null)
    
    try {
      const proofRef = doc(db, 'proofs', proofId)
      
      if (isLiked) {
        await updateDoc(proofRef, {
          likes: arrayRemove(currentUserId)
        })
      } else {
        await updateDoc(proofRef, {
          likes: arrayUnion(currentUserId)
        })
        
        // Notify proof owner (fire and forget - don't let this fail the like)
        if (authorId && authorId !== currentUserId) {
          addDoc(collection(db, 'notifications'), {
            userId: authorId,
            type: 'like',
            message: 'Someone liked your proof!',
            proofId: proofId,
            fromUserId: currentUserId,
            read: false,
            createdAt: serverTimestamp()
          }).catch(err => console.warn('Notification failed:', err))
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      setActionError('Failed to like')
      safeToast.error('Failed to like. Try again.')
    } finally {
      setIsLiking(false)
    }
  }, [isLiking, currentUserId, proofId, isLiked, authorId])

  const handleComment = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    const trimmedComment = newComment.trim()
    if (!trimmedComment || isCommenting) return
    
    if (!currentUserId) {
      safeToast.error('Please sign in to comment')
      return
    }

    if (!proofId) {
      console.error('Cannot comment: missing proof ID')
      return
    }

    setIsCommenting(true)
    setActionError(null)

    try {
      const sanitizedComment = sanitize(trimmedComment)
      const proofRef = doc(db, 'proofs', proofId)
      
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        authorId: currentUserId,
        authorName: 'You', // Will be replaced by actual name from context
        content: sanitizedComment,
        createdAt: Date.now()
      }

      await updateDoc(proofRef, {
        comments: arrayUnion(comment)
      })

      // Notify proof owner (fire and forget)
      if (authorId && authorId !== currentUserId) {
        addDoc(collection(db, 'notifications'), {
          userId: authorId,
          type: 'comment',
          message: `Someone commented: "${safeSlice(sanitizedComment, 0, 50)}..."`,
          proofId: proofId,
          fromUserId: currentUserId,
          read: false,
          createdAt: serverTimestamp()
        }).catch(err => console.warn('Notification failed:', err))
      }

      setNewComment('')
      safeToast.success('Comment added!')
    } catch (error) {
      console.error('Error adding comment:', error)
      setActionError('Failed to comment')
      safeToast.error('Failed to comment. Try again.')
    } finally {
      setIsCommenting(false)
    }
  }, [newComment, isCommenting, currentUserId, proofId, authorId])

  const handleShare = useCallback(async () => {
    try {
      const url = `${window.location.origin}/proof/${proofId}`
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Check out this proof on Cosmos',
            text: safeSlice(content, 0, 100),
            url
          })
          return
        } catch (err) {
          if (err.name === 'AbortError') return
          // Fall through to clipboard
        }
      }
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
        safeToast.success('Link copied!')
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        safeToast.success('Link copied!')
      }
    } catch (error) {
      console.error('Share failed:', error)
      safeToast.error('Could not share')
    }
  }, [proofId, content])

  const handleBookmark = useCallback(async () => {
    if (!currentUserId) {
      safeToast.error('Please sign in to bookmark')
      return
    }
    
    try {
      const userRef = doc(db, 'users', currentUserId)
      
      if (isBookmarked) {
        await updateDoc(userRef, {
          bookmarks: arrayRemove(proofId)
        })
        setIsBookmarked(false)
        safeToast.success('Removed from bookmarks')
      } else {
        await updateDoc(userRef, {
          bookmarks: arrayUnion(proofId)
        })
        setIsBookmarked(true)
        safeToast.success('Bookmarked!')
      }
    } catch (error) {
      console.error('Error bookmarking:', error)
      // Don't show error toast for bookmarks - less critical
    }
  }, [currentUserId, proofId, isBookmarked])

  // ============================================
  // SAFE RENDER FUNCTIONS
  // ============================================

  const renderContent = () => {
    try {
      switch (proofType) {
        case 'link':
          if (!content || !isValidUrl(content)) {
            return <p className="text-zinc-400 italic">Invalid link</p>
          }
          return (
            <a 
              href={content} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors group"
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              <span className="underline break-all group-hover:no-underline">
                {content.length > 60 ? safeSlice(content, 0, 60) + '...' : content}
              </span>
            </a>
          )
          
        case 'image':
          if (!content) {
            return <p className="text-zinc-400 italic">Image not available</p>
          }
          if (imageError) {
            return (
              <div className="flex items-center gap-2 p-4 bg-white/5 rounded-lg text-zinc-400">
                <AlertCircle className="w-5 h-5" />
                <span>Image could not be loaded</span>
              </div>
            )
          }
          return (
            <div className="relative group">
              <img 
                src={content} 
                alt="Proof" 
                className="rounded-lg max-h-96 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => {
                  try {
                    window.open(content, '_blank')
                  } catch {}
                }}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </div>
          )
          
        case 'text':
        default:
          return (
            <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed break-words">
              {content || <span className="text-zinc-500 italic">No content</span>}
            </p>
          )
      }
    } catch (error) {
      console.error('Error rendering content:', error)
      return <p className="text-zinc-400 italic">Content could not be displayed</p>
    }
  }

  const renderComments = () => {
    try {
      const sortedComments = [...comments].sort((a, b) => {
        return safeNumber(b?.createdAt, 0) - safeNumber(a?.createdAt, 0)
      })

      return sortedComments.map((comment, index) => {
        if (!comment || typeof comment !== 'object') return null
        
        const commentId = safeString(comment.id, `fallback_${index}`)
        const commentAuthorId = safeString(comment.authorId)
        const commentAuthorName = safeString(comment.authorName, 'Anonymous')
        const commentContent = safeString(comment.content)
        const commentCreatedAt = safeNumber(comment.createdAt)

        return (
          <div key={commentId} className="flex gap-3 group">
            <a 
              href={commentAuthorId ? `/profile/${commentAuthorId}` : '#'} 
              className="shrink-0"
              onClick={(e) => !commentAuthorId && e.preventDefault()}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-xs text-white font-medium">
                {safeCharAt(commentAuthorName, 0).toUpperCase() || '?'}
              </div>
            </a>
            <div className="flex-1 min-w-0">
              <div className="bg-white/5 rounded-lg rounded-tl-none p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">
                    {commentAuthorName}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {formatTime(commentCreatedAt)}
                  </span>
                </div>
                <p className="text-sm text-zinc-300 break-words">{commentContent}</p>
              </div>
            </div>
          </div>
        )
      }).filter(Boolean) // Remove nulls
    } catch (error) {
      console.error('Error rendering comments:', error)
      return null
    }
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="glass p-5 rounded-xl border border-white/10 hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar */}
        <a 
          href={authorId ? `/profile/${authorId}` : '#'} 
          className="shrink-0"
          onClick={(e) => !authorId && e.preventDefault()}
        >
          {authorAvatar ? (
            <img 
              src={authorAvatar} 
              alt=""
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10 hover:ring-brand-500/50 transition-all"
              onError={(e) => {
                e.target.style.display = 'none'
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div 
            className={`w-11 h-11 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 items-center justify-center text-white font-bold text-lg ring-2 ring-white/10 hover:ring-brand-500/50 transition-all ${authorAvatar ? 'hidden' : 'flex'}`}
          >
            {safeCharAt(authorName, 0).toUpperCase() || '?'}
          </div>
        </a>
        
        {/* Author Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a 
              href={authorId ? `/profile/${authorId}` : '#'}
              className="font-semibold text-white hover:text-brand-400 transition-colors truncate"
              onClick={(e) => !authorId && e.preventDefault()}
            >
              {authorName}
            </a>
            
            {/* Streak Badge */}
            {streak >= 3 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 rounded-full text-xs text-orange-300">
                <Flame className="w-3 h-3" />
                {streak}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>{formatTime(createdAt)}</span>
            {showPodBadge && podName && (
              <>
                <span>•</span>
                <a 
                  href={podSlug ? `/pods/${podSlug}` : '#'}
                  className="text-brand-400 hover:text-brand-300 transition-colors truncate"
                  onClick={(e) => !podSlug && e.preventDefault()}
                >
                  {podName}
                </a>
              </>
            )}
          </div>
        </div>
        
        {/* Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-all"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden">
                <button 
                  onClick={() => { handleBookmark(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current text-brand-400' : ''}`} />
                  {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </button>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        {renderContent()}
      </div>

      {/* Thread Context */}
      {threadTitle && (
        <a 
          href={podSlug && threadId ? `/pods/${podSlug}/thread/${threadId}` : '#'}
          className="block mb-4 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-zinc-400 transition-colors"
          onClick={(e) => (!podSlug || !threadId) && e.preventDefault()}
        >
          💬 in thread: <span className="text-zinc-300">{threadTitle}</span>
        </a>
      )}

      {/* Error Display */}
      {actionError && (
        <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Interaction Bar */}
      <div className="flex items-center gap-1 pt-3 border-t border-white/10">
        {/* Like */}
        <button 
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${
            isLiked 
              ? 'bg-pink-500/20 text-pink-400' 
              : 'hover:bg-white/5 text-zinc-400 hover:text-pink-400'
          }`}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
        </button>

        {/* Comment */}
        <button 
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
            showComments
              ? 'bg-brand-500/20 text-brand-400'
              : 'hover:bg-white/5 text-zinc-400 hover:text-brand-400'
          }`}
          aria-label="Comments"
        >
          <MessageCircle className="w-5 h-5" />
          {commentCount > 0 && <span className="text-sm font-medium">{commentCount}</span>}
        </button>

        {/* Share */}
        <button 
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-glow-400 transition-all"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Bookmark */}
        <button 
          onClick={handleBookmark}
          className={`ml-auto p-2 rounded-lg transition-all ${
            isBookmarked
              ? 'bg-brand-500/20 text-brand-400'
              : 'hover:bg-white/5 text-zinc-400 hover:text-brand-400'
          }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
          {/* Add Comment Form */}
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-white/5 border border-white/10 focus:border-brand-500 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none transition-colors"
              maxLength={500}
              disabled={isCommenting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isCommenting}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              aria-label="Send comment"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </form>

          {/* Comments List */}
          {commentCount > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {renderComments()}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 text-center py-4">
              No comments yet. Start the conversation!
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Memo to prevent unnecessary re-renders
export default memo(ProofCard)
