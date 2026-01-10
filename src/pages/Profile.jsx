import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db, storage } from '../lib/firebase'
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useDropzone } from 'react-dropzone'
import { Edit2, Save, X, Upload, Calendar, Zap, Users, Trophy, Target, Clock, TrendingUp, Star, Award, Lock, ChevronRight, Flame, BookOpen, MessageSquare } from 'lucide-react'
import Avatar from '../components/Avatar'
import toast from 'react-hot-toast'
import { sanitizeText, sanitizeArray, validateData, profileSchema, debounce } from '../utils/security'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import { motion, AnimatePresence } from 'framer-motion'
import { ACHIEVEMENTS, getUserAchievements, getAllAchievementsWithStatus, getAchievementProgress } from '../lib/achievements'
import { Link } from 'react-router-dom'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

export default function Profile(){
  const { currentUser, updateUserProfile } = useAuth()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [goals, setGoals] = useState('')
  const [errors, setErrors] = useState({})
  const [recentProofs, setRecentProofs] = useState([])
  const [stats, setStats] = useState({ totalProofs: 0, streak: 0, podsJoined: 0, longestStreak: 0, memberSince: null })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [achievements, setAchievements] = useState([])
  const [achievementProgress, setAchievementProgress] = useState({})
  const [activityTimeline, setActivityTimeline] = useState([])
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'achievements', 'activity'
  const [showAllAchievements, setShowAllAchievements] = useState(false)

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
        limit(20)
      )
      const postsSnapshot = await getDocs(postsQuery)
      const posts = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setRecentProofs(posts)

      // Calculate longest streak from posts
      let longestStreak = currentUser.longestStreak || currentUser.streak || 0

      // Set stats
      const statsData = {
        totalProofs: currentUser.totalProofs || posts.length,
        streak: currentUser.streak || 0,
        podsJoined: (currentUser.joinedPods || []).length,
        longestStreak: longestStreak,
        memberSince: currentUser.createdAt
      }
      setStats(statsData)

      // Load achievements
      const userAchievements = currentUser.achievements || []
      const allAchievements = getAllAchievementsWithStatus(userAchievements)
      setAchievements(allAchievements)

      // Calculate achievement progress
      const progress = getAchievementProgress(statsData)
      setAchievementProgress(progress)

      // Build activity timeline from posts
      const timeline = posts.slice(0, 10).map(post => ({
        id: post.id,
        type: 'proof',
        content: post.content,
        date: post.createdAt,
        podSlug: post.podSlug,
        podName: post.podName || post.podSlug
      }))

      // Add achievement unlocks to timeline (simulated based on achievements)
      userAchievements.forEach(achievementId => {
        const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId)
        if (achievement) {
          timeline.push({
            id: `achievement-${achievementId}`,
            type: 'achievement',
            content: `Unlocked "${achievement.name}" badge`,
            icon: achievement.icon,
            date: currentUser.createdAt // Would ideally have unlock date
          })
        }
      })

      // Sort timeline by date
      timeline.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date)
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date)
        return dateB - dateA
      })

      setActivityTimeline(timeline.slice(0, 15))
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

  // Format relative time
  function formatRelativeTime(date) {
    if (!date) return ''
    const d = date?.toDate ? date.toDate() : new Date(date)
    const now = new Date()
    const diff = now - d
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  // Get achievement type badge color
  function getAchievementTypeColor(type) {
    switch (type) {
      case 'streak': return 'bg-glow-500/20 text-glow-400 border-glow-500/30'
      case 'proofs': return 'bg-brand-500/20 text-brand-400 border-brand-500/30'
      case 'pods': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'partners': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'verified': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'special': return 'bg-pink-500/20 text-pink-400 border-pink-500/30'
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    }
  }

  // Memoized computed values
  const unlockedCount = useMemo(() => achievements.filter(a => a.unlocked).length, [achievements])
  const totalAchievements = Object.keys(ACHIEVEMENTS).length
  const completionPercentage = Math.round((unlockedCount / totalAchievements) * 100)

  // Calculate stats for display
  const profileStats = useMemo(() => {
    const memberDate = stats.memberSince?.toDate ? stats.memberSince.toDate() : new Date(stats.memberSince)
    const daysSinceJoin = Math.floor((new Date() - memberDate) / 86400000)
    const avgProofsPerWeek = daysSinceJoin > 0 ? ((stats.totalProofs / daysSinceJoin) * 7).toFixed(1) : 0

    return {
      daysSinceJoin,
      avgProofsPerWeek,
      achievementRate: completionPercentage
    }
  }, [stats, completionPercentage])

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 rounded-2xl mb-8"
      >
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

            {/* Level/Achievement Badge */}
            {!editMode && unlockedCount > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-glow-500 to-brand-500 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg">
                {unlockedCount} {unlockedCount === 1 ? 'Badge' : 'Badges'}
              </div>
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
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold">{currentUser.displayName || 'Anonymous'}</h1>
                      {stats.streak >= 7 && (
                        <span className="px-2 py-1 bg-glow-500/20 text-glow-400 rounded-full text-xs font-medium flex items-center gap-1">
                          <Flame size={12} />
                          {stats.streak} Day Streak
                        </span>
                      )}
                    </div>
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
                  {profileStats.daysSinceJoin > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>{profileStats.daysSinceJoin} days on Cosmos</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-white/10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center p-4 bg-white/5 rounded-xl"
          >
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <BookOpen className="text-brand-400" size={20} />
              {stats.totalProofs}
            </div>
            <div className="text-sm text-zinc-400">Total Proofs</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="text-center p-4 bg-white/5 rounded-xl"
          >
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <Flame className="text-glow-500" size={20} />
              {stats.streak}
            </div>
            <div className="text-sm text-zinc-400">Current Streak</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center p-4 bg-white/5 rounded-xl"
          >
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <TrendingUp className="text-green-400" size={20} />
              {stats.longestStreak}
            </div>
            <div className="text-sm text-zinc-400">Best Streak</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            className="text-center p-4 bg-white/5 rounded-xl"
          >
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <Users className="text-purple-400" size={20} />
              {stats.podsJoined}
            </div>
            <div className="text-sm text-zinc-400">Pods Joined</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center p-4 bg-white/5 rounded-xl"
          >
            <div className="flex items-center justify-center gap-2 text-2xl font-bold mb-1">
              <Trophy className="text-yellow-400" size={20} />
              {unlockedCount}/{totalAchievements}
            </div>
            <div className="text-sm text-zinc-400">Achievements</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Target },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'activity', label: 'Activity', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Recent Achievements */}
            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Trophy className="text-yellow-400" size={20} />
                  Recent Badges
                </h2>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1"
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>

              {achievements.filter(a => a.unlocked).length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏆</div>
                  <p className="text-zinc-400">No badges yet. Keep learning!</p>
                  <p className="text-xs text-zinc-500 mt-1">Post proofs and build streaks to earn badges</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {achievements.filter(a => a.unlocked).slice(0, 8).map((achievement, idx) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative"
                    >
                      <div className="w-full aspect-square flex items-center justify-center text-3xl bg-gradient-to-br from-glow-500/20 to-brand-500/20 rounded-xl border border-glow-500/30 hover:scale-110 transition cursor-pointer">
                        {achievement.icon}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-night-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                        {achievement.name}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Achievement Progress */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-400">Badge Progress</span>
                  <span className="text-brand-400">{completionPercentage}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPercentage}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-glow-500 to-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Recent Proofs */}
            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BookOpen className="text-brand-400" size={20} />
                  Recent Proofs
                </h2>
                <Link
                  to="/analytics"
                  className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1"
                >
                  Analytics <ChevronRight size={14} />
                </Link>
              </div>

              {recentProofs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-zinc-400">No proofs yet</p>
                  <Link to="/pods" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
                    Join a pod to start posting
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {recentProofs.slice(0, 5).map((proof, idx) => (
                    <motion.div
                      key={proof.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-brand-500/30 transition"
                    >
                      <p className="text-zinc-200 text-sm line-clamp-2">{proof.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                        <span>{formatRelativeTime(proof.createdAt)}</span>
                        {proof.podName && (
                          <>
                            <span>•</span>
                            <span className="text-brand-400">{proof.podName}</span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass p-6 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Trophy className="text-yellow-400" size={20} />
                  All Achievements
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {unlockedCount} of {totalAchievements} unlocked ({completionPercentage}%)
                </p>
              </div>
              <button
                onClick={() => setShowAllAchievements(!showAllAchievements)}
                className="text-brand-400 hover:text-brand-300 text-sm"
              >
                {showAllAchievements ? 'Show Unlocked Only' : 'Show All'}
              </button>
            </div>

            {/* Achievement Categories */}
            {['streak', 'proofs', 'pods', 'partners', 'verified', 'special'].map(type => {
              const typeAchievements = achievements.filter(a => a.type === type)
              const visibleAchievements = showAllAchievements
                ? typeAchievements
                : typeAchievements.filter(a => a.unlocked)

              if (visibleAchievements.length === 0) return null

              const typeLabels = {
                streak: 'Streak Achievements',
                proofs: 'Proof Achievements',
                pods: 'Community Achievements',
                partners: 'Partnership Achievements',
                verified: 'Verification Achievements',
                special: 'Special Achievements'
              }

              return (
                <div key={type} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
                    {typeLabels[type]}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleAchievements.map((achievement, idx) => {
                      const progress = achievementProgress[achievement.id] || { current: 0, required: 1, percentage: 0 }

                      return (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`p-4 rounded-xl border transition ${
                            achievement.unlocked
                              ? 'bg-gradient-to-br from-glow-500/10 to-brand-500/10 border-glow-500/30'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`text-3xl ${!achievement.unlocked && 'opacity-30 grayscale'}`}>
                              {achievement.unlocked ? achievement.icon : <Lock size={28} className="text-zinc-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium ${achievement.unlocked ? 'text-white' : 'text-zinc-500'}`}>
                                  {achievement.name}
                                </h4>
                                {achievement.unlocked && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                    Unlocked
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-400 mt-0.5">{achievement.description}</p>

                              {!achievement.unlocked && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-zinc-500">Progress</span>
                                    <span className="text-zinc-400">{progress.current}/{progress.required}</span>
                                  </div>
                                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-brand-500/50"
                                      style={{ width: `${progress.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass p-6 rounded-2xl"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Clock className="text-brand-400" size={20} />
              Activity Timeline
            </h2>

            {activityTimeline.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-zinc-400">No activity yet</p>
                <p className="text-xs text-zinc-500 mt-1">Your learning journey will appear here</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />

                <div className="space-y-4">
                  {activityTimeline.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-start gap-4 relative"
                    >
                      {/* Timeline dot */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        item.type === 'proof'
                          ? 'bg-brand-500/20 text-brand-400'
                          : item.type === 'achievement'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-white/10 text-zinc-400'
                      }`}>
                        {item.type === 'proof' ? (
                          <BookOpen size={18} />
                        ) : item.type === 'achievement' ? (
                          <span className="text-lg">{item.icon}</span>
                        ) : (
                          <MessageSquare size={18} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-brand-500/30 transition">
                          {item.type === 'proof' ? (
                            <>
                              <p className="text-zinc-200 text-sm">{item.content}</p>
                              {item.podName && (
                                <span className="inline-block mt-2 px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded text-xs">
                                  {item.podName}
                                </span>
                              )}
                            </>
                          ) : (
                            <p className="text-zinc-200 text-sm flex items-center gap-2">
                              <Trophy size={14} className="text-yellow-400" />
                              {item.content}
                            </p>
                          )}
                          <p className="text-xs text-zinc-500 mt-2">
                            {formatRelativeTime(item.date)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 glass p-4 rounded-xl flex flex-wrap items-center justify-center gap-6 text-sm"
      >
        <div className="flex items-center gap-2 text-zinc-400">
          <TrendingUp size={16} className="text-green-400" />
          <span>{profileStats.avgProofsPerWeek} proofs/week avg</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Star size={16} className="text-yellow-400" />
          <span>{completionPercentage}% achievements unlocked</span>
        </div>
        <Link
          to="/analytics"
          className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition"
        >
          <Target size={16} />
          <span>View detailed analytics</span>
          <ChevronRight size={14} />
        </Link>
      </motion.div>
    </section>
  )
}
