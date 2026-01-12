// ProofComposer.jsx - PRODUCTION-SAFE version
// Create and post proofs with comprehensive validation and error handling

import { useState, useRef, useCallback, memo } from 'react'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  increment
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import {
  Type,
  Link,
  Image as ImageIcon,
  Send,
  X,
  Globe,
  Lock,
  Loader2,
  Upload,
  AlertCircle
} from 'lucide-react'
import { safeToast, safeString, safeNumber } from '../utils/safe'
import { sanitizeText } from '../utils/security'
import { checkAchievements } from '../lib/achievements'
import { useCelebration } from '../contexts/CelebrationContext'

// Use sanitizeText from security.js, fallback to basic escaping
const sanitize = (str) => {
  try {
    return sanitizeText(str)
  } catch {
    if (typeof str !== 'string') return ''
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
}

// URL validation
const isValidUrl = (string) => {
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// File validation
const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file selected' }
  
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Please select a valid image (JPEG, PNG, GIF, or WebP)' }
  }
  
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { valid: false, error: 'Image must be less than 5MB' }
  }
  
  return { valid: true, error: null }
}

const PROOF_TYPES = [
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'link', icon: Link, label: 'Link' },
  { id: 'image', icon: ImageIcon, label: 'Image' }
]

// ============================================
// COMPONENT
// ============================================

function ProofComposer({
  podSlug = '',
  podName = '',
  threadId = null,
  threadTitle = null,
  onSuccess
}) {
  // Safe auth hook
  let user = null
  try {
    const auth = useAuth()
    user = auth?.currentUser
  } catch {
    trackError('Auth context not available', { component: 'Composer' }, 'warn', ErrorCategory.AUTH)
  }

  // Celebration hook for streak milestones
  const { checkStreakMilestone, celebrate } = useCelebration()

  const fileInputRef = useRef(null)
  
  const [type, setType] = useState('text')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [isPosting, setIsPosting] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState(null)

  // ============================================
  // SAFE HANDLERS
  // ============================================

  // Get user profile safely
  const getUserProfile = useCallback(async () => {
    if (!user?.uid) return null
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        return userDoc.data()
      }
    } catch (error) {
      trackError(error, { action: 'getUserProfile', userId: user?.uid }, 'warn', ErrorCategory.FIRESTORE)
    }
    return null
  }, [user?.uid])

  // Handle image selection
  const handleImageSelect = useCallback((e) => {
    setError(null)
    
    try {
      const file = e?.target?.files?.[0]
      if (!file) return

      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error)
        safeToast.error(validation.error)
        return
      }

      setImageFile(file)
      
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          setImagePreview(event.target.result)
        } catch {
          setError('Failed to preview image')
        }
      }
      reader.onerror = () => {
        setError('Failed to read image file')
      }
      reader.readAsDataURL(file)
    } catch (err) {
      trackError(err, { action: 'imageSelect' }, 'error', ErrorCategory.UI)
      setError('Failed to select image')
    }
  }, [])

  // Upload image to Firebase Storage
  const uploadImage = useCallback(async () => {
    if (!imageFile || !user?.uid) return null

    try {
      // Generate safe filename
      const timestamp = Date.now()
      const safeName = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 50)
      const storageRef = ref(storage, `proofs/${user.uid}/${timestamp}_${safeName}`)
      
      await uploadBytes(storageRef, imageFile)
      return getDownloadURL(storageRef)
    } catch (error) {
      trackError(error, { action: 'uploadImage', userId: user?.uid }, 'error', ErrorCategory.STORAGE)
      throw new Error('Failed to upload image')
    }
  }, [imageFile, user?.uid])

  // Calculate streak
  const calculateStreak = useCallback(async () => {
    if (!user?.uid) return 1
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) return 1
      
      const userData = userDoc.data()
      const lastProofDate = userData.lastProofDate
      
      if (!lastProofDate) return 1
      
      // Handle both Firestore Timestamp and regular timestamp
      const lastDate = lastProofDate.toDate ? lastProofDate.toDate() : new Date(lastProofDate)
      const today = new Date()
      
      // Reset hours to compare dates only
      lastDate.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        return safeNumber(userData.streak, 1)
      } else if (diffDays === 1) {
        return safeNumber(userData.streak, 0) + 1
      } else {
        return 1 // Streak broken
      }
    } catch (error) {
      trackError(error, { action: 'calculateStreak', userId: user?.uid }, 'warn', ErrorCategory.FIRESTORE)
      return 1
    }
  }, [user?.uid])

  // Validate submission
  const validateSubmission = useCallback(() => {
    if (!user?.uid) {
      return { valid: false, error: 'Please sign in to post' }
    }

    if (!podSlug) {
      return { valid: false, error: 'Pod information missing' }
    }

    if (type === 'text') {
      const trimmed = content.trim()
      if (!trimmed) {
        return { valid: false, error: 'Please write something' }
      }
      if (trimmed.length > 2000) {
        return { valid: false, error: 'Text is too long (max 2000 characters)' }
      }
    }

    if (type === 'link') {
      const trimmed = content.trim()
      if (!trimmed) {
        return { valid: false, error: 'Please enter a URL' }
      }
      if (!isValidUrl(trimmed)) {
        return { valid: false, error: 'Please enter a valid URL (http:// or https://)' }
      }
    }

    if (type === 'image') {
      if (!imageFile) {
        return { valid: false, error: 'Please select an image' }
      }
    }

    return { valid: true, error: null }
  }, [user?.uid, podSlug, type, content, imageFile])

  // Submit proof
  const handleSubmit = useCallback(async (e) => {
    if (e?.preventDefault) e.preventDefault()
    
    if (isPosting) return
    
    setError(null)
    
    // Validate
    const validation = validateSubmission()
    if (!validation.valid) {
      setError(validation.error)
      safeToast.error(validation.error)
      return
    }

    setIsPosting(true)

    try {
      // Get user profile
      const profile = await getUserProfile()
      
      // Prepare content
      let proofContent = ''
      
      if (type === 'image') {
        proofContent = await uploadImage()
        if (!proofContent) {
          throw new Error('Failed to upload image')
        }
      } else {
        proofContent = sanitize(content.trim())
      }

      // Calculate streak
      const streak = await calculateStreak()

      // Create proof document
      const proofData = {
        authorId: user.uid,
        authorName: safeString(profile?.name || profile?.displayName || user.displayName, 'Anonymous'),
        authorAvatar: safeString(profile?.photoURL || user.photoURL, ''),
        podSlug: safeString(podSlug),
        podName: safeString(podName),
        threadId: threadId ? safeString(threadId) : null,
        threadTitle: threadTitle ? safeString(threadTitle) : null,
        type: type,
        content: proofContent,
        visibility: visibility,
        likes: [],
        comments: [],
        streak: streak,
        createdAt: Date.now(),
        createdAtServer: serverTimestamp()
      }

      // Add to Firestore
      await addDoc(collection(db, 'proofs'), proofData)

      // Update user stats (fire and forget)
      updateDoc(doc(db, 'users', user.uid), {
        totalProofs: increment(1),
        streak: streak,
        lastProofDate: serverTimestamp()
      }).catch(err => trackError(err, { action: 'updateStats', userId: user.uid }, 'warn', ErrorCategory.FIRESTORE))

      // Check for new achievements and celebrate if any
      const oldStreak = profile?.streak || 0
      const isFirstProof = (profile?.totalProofs || 0) === 0

      checkAchievements(user.uid, {
        streak: streak,
        totalProofs: (profile?.totalProofs || 0) + 1,
        podsJoined: profile?.joinedPods?.length || 0
      }, { justPostedProof: true })
        .then(newAchievements => {
          // Celebrate based on what happened
          if (isFirstProof) {
            // First proof celebration (higher priority)
            setTimeout(() => celebrate('FIRST_PROOF'), 500)
          } else if (checkStreakMilestone(streak, oldStreak)) {
            // Streak milestone was celebrated
          } else if (newAchievements && newAchievements.length > 0) {
            // Celebrate first new achievement
            setTimeout(() => celebrate('ACHIEVEMENT', {
              title: newAchievements[0].name,
              subtitle: newAchievements[0].description,
              icon: newAchievements[0].icon || '🏆'
            }), 500)
          }
        })
        .catch(err =>
          trackError(err, { action: 'checkAchievements', userId: user.uid }, 'warn', ErrorCategory.FIRESTORE)
        )

      // Reset form
      setContent('')
      setImagePreview(null)
      setImageFile(null)
      setType('text')
      setError(null)
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      safeToast.success('Proof posted! 🎉')
      
      // Callback
      if (typeof onSuccess === 'function') {
        try {
          onSuccess()
        } catch {}
      }

    } catch (error) {
      trackError(error, { action: 'postProof', podSlug, type }, 'error', ErrorCategory.FIRESTORE)
      const errorMsg = error?.message || 'Failed to post. Please try again.'
      setError(errorMsg)
      safeToast.error(errorMsg)
    } finally {
      setIsPosting(false)
    }
  }, [
    isPosting, 
    validateSubmission, 
    getUserProfile, 
    type, 
    uploadImage, 
    content, 
    calculateStreak, 
    user, 
    podSlug, 
    podName, 
    threadId, 
    threadTitle, 
    visibility, 
    onSuccess
  ])

  // Clear form
  const handleClear = useCallback(() => {
    setContent('')
    setImagePreview(null)
    setImageFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Change type
  const handleTypeChange = useCallback((newType) => {
    setType(newType)
    setError(null)
    if (newType !== 'image') {
      setImagePreview(null)
      setImageFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  // ============================================
  // RENDER
  // ============================================

  // Don't render if no user (but don't crash)
  if (!user) {
    return (
      <div className="glass p-5 rounded-xl border border-white/10 text-center">
        <p className="text-zinc-400">Please sign in to share your progress</p>
      </div>
    )
  }

  return (
    <div className="glass p-5 rounded-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Share Your Progress</h3>
        
        {/* Visibility Toggle */}
        <button
          type="button"
          onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
            visibility === 'public'
              ? 'bg-brand-500/20 text-brand-400'
              : 'bg-zinc-700/50 text-zinc-400'
          }`}
          disabled={isPosting}
        >
          {visibility === 'public' ? (
            <>
              <Globe className="w-4 h-4" />
              <span>Public</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Private</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector */}
        <div className="flex gap-2">
          {PROOF_TYPES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTypeChange(id)}
              disabled={isPosting}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50 ${
                type === id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Content Input - Text */}
        {type === 'text' && (
          <div>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setError(null)
              }}
              placeholder="What did you accomplish today? Share your progress, learnings, or wins..."
              className="w-full min-h-[160px] bg-white/5 border border-white/10 focus:border-brand-500 rounded-xl px-4 py-4 text-white placeholder-zinc-500 focus:outline-none resize-y transition-colors disabled:opacity-50 text-base leading-relaxed"
              maxLength={2000}
              disabled={isPosting}
            />
            <div className="text-right text-xs text-zinc-500 mt-2">
              {content.length}/2000
            </div>
          </div>
        )}

        {/* Content Input - Link */}
        {type === 'link' && (
          <div className="space-y-2">
            <input
              type="url"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                setError(null)
              }}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 focus:border-brand-500 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-50"
              disabled={isPosting}
            />
            <p className="text-xs text-zinc-500">
              Share a link to your work: GitHub, Figma, blog post, etc.
            </p>
          </div>
        )}

        {/* Content Input - Image */}
        {type === 'image' && (
          <div className="space-y-3">
            {imagePreview ? (
              <div className="relative">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full max-h-64 object-cover rounded-lg"
                  onError={() => {
                    setImagePreview(null)
                    setImageFile(null)
                    setError('Image preview failed')
                  }}
                />
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isPosting}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Remove selected image"
                >
                  <X className="w-5 h-5 text-white" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPosting}
                className="w-full h-40 border-2 border-dashed border-white/20 hover:border-brand-500/50 rounded-lg flex flex-col items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-8 h-8 text-zinc-500" />
                <span className="text-sm text-zinc-400">Click to upload an image</span>
                <span className="text-xs text-zinc-500">JPEG, PNG, GIF, WebP • Max 5MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isPosting}
              aria-label="Upload image for your proof"
            />
          </div>
        )}

        {/* Thread Context */}
        {threadTitle && (
          <div className="px-3 py-2 bg-white/5 rounded-lg text-sm">
            <span className="text-zinc-400">Posting in: </span>
            <span className="text-white">{threadTitle}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            {visibility === 'public' 
              ? '👀 Visible to all pod members' 
              : '🔒 Only visible to you'}
          </p>
          
          <button
            type="submit"
            disabled={isPosting || (type !== 'image' && !content.trim()) || (type === 'image' && !imageFile)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            {isPosting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Post Proof</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default memo(ProofComposer)
