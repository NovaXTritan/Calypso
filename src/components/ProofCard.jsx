// ProofCard.jsx - PRODUCTION-SAFE version with comprehensive error handling
// This component will NOT crash even with malformed data

import { useState, useCallback, memo } from 'react'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import {
  doc,
  updateDoc,
  deleteDoc,
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
  AlertCircle,
  Pencil,
  Trash2,
  X,
  Check,
  PartyPopper,
  Lightbulb,
  ThumbsUp,
  BadgeCheck,
  Shield,
  ShieldCheck
} from 'lucide-react'
import {
  verifyProof,
  unverifyProof,
  getVerificationLevel,
  canVerify,
  isVerifiedByUser
} from '../lib/verification'
import {
  safeToast,
  safeString,
  safeSlice,
  safeCharAt,
  safeArray,
  safeIncludes,
  safeLength,
  safeNumber
} from '../utils/safe'
import { sanitizeText } from '../utils/security'
import { isModerator as checkIsModerator } from '../config/constants'

// Reaction types with their icons and colors
const REACTION_TYPES = {
  like: { icon: Heart, label: 'Like', color: 'pink', activeColor: 'bg-pink-500/20 text-pink-400' },
  celebrate: { icon: PartyPopper, label: 'Celebrate', color: 'yellow', activeColor: 'bg-yellow-500/20 text-yellow-400' },
  insightful: { icon: Lightbulb, label: 'Insightful', color: 'blue', activeColor: 'bg-blue-500/20 text-blue-400' },
  helpful: { icon: ThumbsUp, label: 'Helpful', color: 'green', activeColor: 'bg-green-500/20 text-green-400' }
}

// Use sanitizeText from security.js, fallback to basic escaping
const sanitize = (str) => {
  try {
    return sanitizeText(str)
  } catch {
    if (typeof str !== 'string') return ''
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }
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

function ProofCard({ proof, currentUserId, currentUserEmail, currentUserName, showPodBadge = false }) {
  // Defensive: ensure proof exists
  if (!proof || typeof proof !== 'object') {
    return null // Don't render anything if proof is invalid
  }

  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isReacting, setIsReacting] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

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
  // New reactions system - object with arrays for each type
  const reactions = proof.reactions || {}
  const likeReactions = safeArray(reactions.like || proof.likes) // Fallback to old likes
  const celebrateReactions = safeArray(reactions.celebrate)
  const insightfulReactions = safeArray(reactions.insightful)
  const helpfulReactions = safeArray(reactions.helpful)

  // Verification data
  const verifications = safeArray(proof.verifications)
  const verificationCount = safeNumber(proof.verificationCount, verifications.length)
  const verificationLevel = getVerificationLevel(verificationCount)
  const userHasVerified = isVerifiedByUser(proof, currentUserId)
  const userCanVerify = canVerify(proof, currentUserId)

  // Check user's reactions
  const userReactions = {
    like: safeIncludes(likeReactions, currentUserId),
    celebrate: safeIncludes(celebrateReactions, currentUserId),
    insightful: safeIncludes(insightfulReactions, currentUserId),
    helpful: safeIncludes(helpfulReactions, currentUserId)
  }

  // Get total reaction count
  const totalReactions = likeReactions.length + celebrateReactions.length + insightfulReactions.length + helpfulReactions.length
  const isLiked = userReactions.like
  const likeCount = safeLength(likes)
  const commentCount = safeLength(comments)

  // ============================================
  // SAFE EVENT HANDLERS
  // ============================================

  // Generic reaction handler for all reaction types
  const handleReaction = useCallback(async (reactionType) => {
    if (isReacting) return

    if (!currentUserId) {
      safeToast.error('Please sign in to react')
      return
    }

    if (!proofId) {
      trackError('Cannot react: missing proof ID', { action: 'handleReaction' }, 'warn', ErrorCategory.VALIDATION)
      return
    }

    setIsReacting(true)
    setActionError(null)
    setShowReactionPicker(false)

    try {
      const proofRef = doc(db, 'proofs', proofId)
      const hasReacted = userReactions[reactionType]
      const reactionField = `reactions.${reactionType}`

      if (hasReacted) {
        await updateDoc(proofRef, {
          [reactionField]: arrayRemove(currentUserId)
        })
      } else {
        await updateDoc(proofRef, {
          [reactionField]: arrayUnion(currentUserId)
        })

        // Notify proof owner (fire and forget)
        if (authorId && authorId !== currentUserId) {
          const reactionLabel = REACTION_TYPES[reactionType]?.label || 'reacted to'
          addDoc(collection(db, 'notifications'), {
            userId: authorId,
            type: 'reaction',
            reactionType: reactionType,
            message: `Someone ${reactionLabel.toLowerCase()}d your proof!`,
            proofId: proofId,
            fromUserId: currentUserId,
            read: false,
            createdAt: serverTimestamp()
          }).catch(err => trackError(err, { action: 'reactionNotification', proofId }, 'warn', ErrorCategory.FIRESTORE))
        }
      }
    } catch (error) {
      trackError(error, { action: 'toggleReaction', proofId, reactionType }, 'error', ErrorCategory.FIRESTORE)
      setActionError('Failed to react')
      safeToast.error('Failed to react. Try again.')
    } finally {
      setIsReacting(false)
    }
  }, [isReacting, currentUserId, proofId, userReactions, authorId])

  // Legacy handleLike for backwards compatibility
  const handleLike = useCallback(() => handleReaction('like'), [handleReaction])

  const handleComment = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    const trimmedComment = newComment.trim()
    if (!trimmedComment || isCommenting) return
    
    if (!currentUserId) {
      safeToast.error('Please sign in to comment')
      return
    }

    if (!proofId) {
      trackError('Cannot comment: missing proof ID', { action: 'handleComment' }, 'warn', ErrorCategory.VALIDATION)
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
        authorName: currentUserName || 'Anonymous',
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
        }).catch(err => trackError(err, { action: 'commentNotification', proofId }, 'warn', ErrorCategory.FIRESTORE))
      }

      setNewComment('')
      safeToast.success('Comment added!')
    } catch (error) {
      trackError(error, { action: 'addComment', proofId }, 'error', ErrorCategory.FIRESTORE)
      setActionError('Failed to comment')
      safeToast.error('Failed to comment. Try again.')
    } finally {
      setIsCommenting(false)
    }
  }, [newComment, isCommenting, currentUserId, currentUserName, proofId, authorId])

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
      trackError(error, { action: 'share', proofId }, 'error', ErrorCategory.UI)
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
      trackError(error, { action: 'bookmark', proofId }, 'warn', ErrorCategory.FIRESTORE)
      // Don't show error toast for bookmarks - less critical
    }
  }, [currentUserId, proofId, isBookmarked])

  const handleEdit = useCallback(() => {
    setEditContent(content)
    setIsEditing(true)
    setShowMenu(false)
  }, [content])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditContent('')
  }, [])

  const handleSaveEdit = useCallback(async () => {
    const trimmedContent = editContent.trim()
    if (!trimmedContent) {
      safeToast.error('Content cannot be empty')
      return
    }

    if (!proofId) {
      trackError('Cannot edit: missing proof ID', { action: 'handleSaveEdit' }, 'warn', ErrorCategory.VALIDATION)
      return
    }

    try {
      const sanitizedContent = sanitize(trimmedContent)
      const proofRef = doc(db, 'proofs', proofId)

      await updateDoc(proofRef, {
        content: sanitizedContent,
        updatedAt: Date.now()
      })

      setIsEditing(false)
      setEditContent('')
      safeToast.success('Post updated!')
    } catch (error) {
      trackError(error, { action: 'editPost', proofId }, 'error', ErrorCategory.FIRESTORE)
      safeToast.error('Failed to update post')
    }
  }, [editContent, proofId])

  const handleDelete = useCallback(async () => {
    if (!proofId) {
      trackError('Cannot delete: missing proof ID', { action: 'handleDelete' }, 'warn', ErrorCategory.VALIDATION)
      return
    }

    setIsDeleting(true)

    try {
      await deleteDoc(doc(db, 'proofs', proofId))
      safeToast.success('Post deleted')
    } catch (error) {
      trackError(error, { action: 'deletePost', proofId }, 'error', ErrorCategory.FIRESTORE)
      safeToast.error('Failed to delete post')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [proofId])

  const handleVerification = useCallback(async () => {
    if (isVerifying || !currentUserId) return

    setIsVerifying(true)
    setActionError(null)

    try {
      if (userHasVerified) {
        const result = await unverifyProof(proofId, currentUserId)
        if (!result.success) {
          throw new Error(result.error || 'Failed to remove verification')
        }
      } else {
        const result = await verifyProof(proofId, currentUserId, currentUserName)
        if (!result.success) {
          throw new Error(result.error || 'Failed to verify')
        }
        safeToast.success('Proof verified!')
      }
    } catch (error) {
      trackError(error, { action: 'verification', proofId }, 'error', ErrorCategory.FIRESTORE)
      setActionError(error.message || 'Verification failed')
      safeToast.error(error.message || 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }, [isVerifying, currentUserId, userHasVerified, proofId, currentUserName])

  const isAuthor = currentUserId && authorId && currentUserId === authorId
  const isModeratorUser = checkIsModerator(currentUserEmail)
  const canModify = isAuthor || isModeratorUser

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
      trackError(error, { action: 'renderContent', proofId }, 'error', ErrorCategory.UI)
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
      trackError(error, { action: 'renderComments', proofId }, 'error', ErrorCategory.UI)
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

            {/* Verification Badge */}
            {verificationCount > 0 && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  verificationLevel.label === 'Trusted'
                    ? 'bg-glow-500/20 text-glow-400'
                    : verificationLevel.label === 'Verified'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                }`}
                title={`${verificationCount} verifications`}
              >
                {verificationLevel.label === 'Trusted' ? (
                  <ShieldCheck className="w-3 h-3" />
                ) : verificationLevel.label === 'Verified' ? (
                  <BadgeCheck className="w-3 h-3" />
                ) : (
                  <Shield className="w-3 h-3" />
                )}
                {verificationLevel.label}
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
                {canModify && (
                  <>
                    {isAuthor && (
                      <button
                        onClick={handleEdit}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isModeratorUser && !isAuthor ? 'Delete (Mod)' : 'Delete'}
                    </button>
                    <div className="border-t border-white/10" />
                  </>
                )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Post?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. Your post will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mb-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-brand-500 rounded-lg text-white placeholder-zinc-500 focus:outline-none transition min-h-[100px]"
              maxLength={2000}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        ) : (
          renderContent()
        )}
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

      {/* Reaction Summary - Show all reactions if any */}
      {totalReactions > 0 && (
        <div className="flex items-center gap-2 pt-3 pb-2">
          <div className="flex -space-x-1">
            {likeReactions.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Heart className="w-3 h-3 text-pink-400" />
              </span>
            )}
            {celebrateReactions.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <PartyPopper className="w-3 h-3 text-yellow-400" />
              </span>
            )}
            {insightfulReactions.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Lightbulb className="w-3 h-3 text-blue-400" />
              </span>
            )}
            {helpfulReactions.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <ThumbsUp className="w-3 h-3 text-green-400" />
              </span>
            )}
          </div>
          <span className="text-sm text-zinc-400">{totalReactions}</span>
        </div>
      )}

      {/* Interaction Bar */}
      <div className="flex items-center gap-1 pt-3 border-t border-white/10">
        {/* Reaction Button with Picker */}
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            onMouseEnter={() => setShowReactionPicker(true)}
            disabled={isReacting}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${
              Object.values(userReactions).some(v => v)
                ? 'bg-pink-500/20 text-pink-400'
                : 'hover:bg-white/5 text-zinc-400 hover:text-pink-400'
            }`}
            aria-label="React"
          >
            <Heart className={`w-5 h-5 ${userReactions.like ? 'fill-current' : ''}`} />
            {totalReactions > 0 && <span className="text-sm font-medium">{totalReactions}</span>}
          </button>

          {/* Reaction Picker Popup */}
          {showReactionPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowReactionPicker(false)}
                onMouseLeave={() => setShowReactionPicker(false)}
              />
              <div
                className="absolute bottom-full left-0 mb-2 flex items-center gap-1 p-2 bg-zinc-800 border border-white/10 rounded-xl shadow-xl z-20"
                onMouseLeave={() => setShowReactionPicker(false)}
              >
                {Object.entries(REACTION_TYPES).map(([type, { icon: Icon, label, activeColor }]) => {
                  const isActive = userReactions[type]
                  return (
                    <button
                      key={type}
                      onClick={() => handleReaction(type)}
                      className={`p-2 rounded-lg transition-all hover:scale-110 ${
                        isActive ? activeColor : 'hover:bg-white/10'
                      }`}
                      title={label}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? '' : 'text-zinc-400'}`} />
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

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

        {/* Verify Button - only for non-authors */}
        {!isAuthor && currentUserId && (
          <button
            onClick={handleVerification}
            disabled={isVerifying}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all disabled:opacity-50 ${
              userHasVerified
                ? 'bg-green-500/20 text-green-400'
                : 'hover:bg-white/5 text-zinc-400 hover:text-green-400'
            }`}
            title={userHasVerified ? 'Remove verification' : 'Verify this proof is genuine'}
            aria-label={userHasVerified ? 'Remove verification' : 'Verify'}
          >
            <BadgeCheck className={`w-5 h-5 ${userHasVerified ? 'fill-current' : ''}`} />
            {verificationCount > 0 && (
              <span className="text-sm font-medium">{verificationCount}</span>
            )}
          </button>
        )}

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
