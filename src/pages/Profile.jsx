import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db, storage } from '../lib/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useDropzone } from 'react-dropzone'
import { Edit2, Save, X, Upload, Calendar, Zap, Users } from 'lucide-react'
import Avatar from '../components/Avatar'
import toast from 'react-hot-toast'
import { sanitizeText, sanitizeArray, validateData, profileSchema, debounce } from '../utils/security'
import { trackError, ErrorCategory } from '../utils/errorTracking'

export default function Profile(){
  const { currentUser, updateUserProfile } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [goals, setGoals] = useState('')
  const [errors, setErrors] = useState({})
  const [recentProofs, setRecentProofs] = useState([])
  const [stats, setStats] = useState({ totalProofs: 0, streak: 0, podsJoined: 0 })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '')
      setBio(currentUser.bio || '')
      setGoals((currentUser.goals || []).join(', '))
      fetchUserData()
    }
  }, [currentUser])

  async function fetchUserData() {
    if (!currentUser) return

    try {
      // Fetch recent proofs
      const postsQuery = query(
        collection(db, 'posts'),
        where('author', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
      const postsSnapshot = await getDocs(postsQuery)
      const posts = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setRecentProofs(posts)

      // Set stats
      setStats({
        totalProofs: currentUser.totalProofs || posts.length,
        streak: currentUser.streak || 0,
        podsJoined: (currentUser.joinedPods || []).length
      })
    } catch (error) {
      trackError(error, { action: 'fetchUserData', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to load profile data')
    }
  }

  async function handleImageUpload(acceptedFiles) {
    if (!acceptedFiles || acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setUploading(true)

    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}`)
      await uploadBytes(storageRef, file)
      const photoURL = await getDownloadURL(storageRef)

      await updateUserProfile({ photoURL })
      toast.success('Profile picture updated! 📸')
    } catch (error) {
      trackError(error, { action: 'uploadAvatar', userId: currentUser?.uid }, 'error', ErrorCategory.STORAGE)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleImageUpload,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: !editMode || uploading
  })

  async function handleSave() {
    setErrors({})
    
    // SECURITY FIX: Sanitize all inputs
    const sanitizedData = {
      displayName: sanitizeText(displayName),
      bio: sanitizeText(bio),
      goals: sanitizeArray(goals.split(',').map(g => g.trim()))
    }

    // VALIDATION FIX: Validate with schema
    const validation = validateData(profileSchema, sanitizedData)
    
    if (!validation.success) {
      setErrors(validation.errors)
      const firstError = Object.values(validation.errors)[0]
      toast.error(firstError)
      return
    }

    // RACE CONDITION FIX: Disable button during save
    setSaving(true)
    
    try {
      await updateUserProfile(validation.data)
      toast.success('Profile updated! ✨')
      setEditMode(false)
    } catch (error) {
      trackError(error, { action: 'updateProfile', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // DEBOUNCE FIX: Create debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      handleSave()
    }, 500),
    [displayName, bio, goals]
  )

  function handleCancel() {
    setDisplayName(currentUser.displayName || '')
    setBio(currentUser.bio || '')
    setGoals((currentUser.goals || []).join(', '))
    setErrors({})
    setEditMode(false)
  }

  if (!currentUser) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      {/* Profile Header */}
      <div className="glass p-8 rounded-2xl mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div {...getRootProps()} className={`cursor-pointer ${editMode ? 'ring-2 ring-brand-400' : ''} rounded-full`}>
              <input {...getInputProps()} />
              <Avatar 
                user={currentUser} 
                size="xl"
                className="w-32 h-32"
              />
              {editMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition">
                  {uploading ? (
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Upload className="text-white" size={24} />
                  )}
                </div>
              )}
            </div>
            {editMode && isDragActive && (
              <p className="text-xs text-brand-400 mt-2">Drop image here</p>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={`w-full bg-white/5 border ${
                      errors.displayName ? 'border-red-500' : 'border-white/10'
                    } rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400`}
                    placeholder="Your name"
                    disabled={saving}
                  />
                  {errors.displayName && (
                    <p className="text-red-400 text-sm mt-1">{errors.displayName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={`w-full bg-white/5 border ${
                      errors.bio ? 'border-red-500' : 'border-white/10'
                    } rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 min-h-[100px]`}
                    placeholder="Tell us about yourself"
                    disabled={saving}
                    maxLength={500}
                  />
                  {errors.bio && (
                    <p className="text-red-400 text-sm mt-1">{errors.bio}</p>
                  )}
                  <p className="text-xs text-zinc-500 mt-1">{bio.length}/500 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Learning Goals</label>
                  <input
                    type="text"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    className={`w-full bg-white/5 border ${
                      errors.goals ? 'border-red-500' : 'border-white/10'
                    } rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400`}
                    placeholder="AI, Web Dev, Data Science (comma-separated)"
                    disabled={saving}
                  />
                  {errors.goals && (
                    <p className="text-red-400 text-sm mt-1">{errors.goals}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-6 py-2 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold">{currentUser.displayName || 'Anonymous'}</h1>
                    <p className="text-zinc-400 mt-1">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn-primary px-4 py-2 flex items-center gap-2"
                  >
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                </div>

                {currentUser.bio && (
                  <p className="text-zinc-300 mb-4">{currentUser.bio}</p>
                )}

                {currentUser.goals && currentUser.goals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {currentUser.goals.map((goal, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-brand-400/20 text-brand-400 rounded-full text-sm"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-6 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>Joined {new Date(currentUser.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <Zap className="text-brand-400" size={20} />
              {stats.totalProofs}
            </div>
            <div className="text-sm text-zinc-400">Proofs</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <Zap className="text-glow-500" size={20} />
              {stats.streak}
            </div>
            <div className="text-sm text-zinc-400">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <Users className="text-brand-400" size={20} />
              {stats.podsJoined}
            </div>
            <div className="text-sm text-zinc-400">Pods</div>
          </div>
        </div>
      </div>

      {/* Recent Proofs */}
      <div className="glass p-6 rounded-2xl">
        <h2 className="text-xl font-semibold mb-4">Recent Proofs</h2>
        {recentProofs.length === 0 ? (
          <p className="text-zinc-400 text-center py-8">No proofs posted yet</p>
        ) : (
          <div className="space-y-3">
            {recentProofs.slice(0, 5).map(proof => (
              <div key={proof.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-zinc-200">{proof.content}</p>
                <p className="text-xs text-zinc-500 mt-2">
                  {new Date(proof.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
