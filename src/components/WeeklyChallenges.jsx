// WeeklyChallenges.jsx - Weekly Challenges widget
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CHALLENGE_TYPES,
  DIFFICULTY,
  getActiveChallenges,
  joinChallenge,
  getChallengeLeaderboard,
  createChallenge
} from '../lib/challenges'
import {
  Trophy,
  Target,
  Users,
  Clock,
  Plus,
  X,
  ChevronRight,
  Crown,
  Medal
} from 'lucide-react'
import { isModerator as checkIsModerator } from '../config/constants'

export default function WeeklyChallenges({ userId, userEmail, userName, podSlug, podName }) {
  const [challenges, setChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const isModeratorUser = checkIsModerator(userEmail)

  // Load active challenges
  useEffect(() => {
    const loadChallenges = async () => {
      setLoading(true)
      setError(null)
      try {
        const activeChallenges = await getActiveChallenges(podSlug)
        setChallenges(activeChallenges)
      } catch (err) {
        console.error('Error loading challenges:', err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    loadChallenges()
  }, [podSlug])

  const handleJoinChallenge = async (challengeId) => {
    setActionLoading(true)
    const result = await joinChallenge(challengeId, userId, userName)
    if (result.success) {
      // Refresh challenges
      const activeChallenges = await getActiveChallenges(podSlug)
      setChallenges(activeChallenges)
    }
    setActionLoading(false)
  }

  const handleCreateChallenge = async (challengeData) => {
    setActionLoading(true)
    const result = await createChallenge(userId, {
      ...challengeData,
      podSlug
    })
    if (result.success) {
      const activeChallenges = await getActiveChallenges(podSlug)
      setChallenges(activeChallenges)
      setShowCreateModal(false)
    }
    setActionLoading(false)
  }

  const formatTimeLeft = (endDate) => {
    const now = Date.now()
    const diff = endDate - now

    if (diff <= 0) return 'Ended'

    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

    if (days > 0) return `${days}d ${hours}h left`
    return `${hours}h left`
  }

  const getProgressPercent = (challenge, userId) => {
    const participant = challenge.participants?.find(p => p.userId === userId)
    if (!participant) return 0
    return Math.min(100, Math.floor((participant.progress / challenge.target) * 100))
  }

  const isJoined = (challenge) => {
    return challenge.participants?.some(p => p.userId === userId)
  }

  if (loading) {
    return (
      <div className="glass p-4 rounded-xl">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-night-600 rounded w-1/2" />
          <div className="h-20 bg-night-600 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="glass p-5 rounded-2xl space-y-4 border border-white/5 hover:border-white/10 transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <span className="bg-gradient-to-r from-white to-night-200 bg-clip-text text-transparent">
            Weekly Challenges
          </span>
        </h3>
        {isModeratorUser && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-glow-500/10 hover:bg-glow-500/20 text-glow-400 text-xs rounded-lg transition-all border border-glow-500/20"
          >
            <Plus className="w-3 h-3" />
            Create
          </button>
        )}
      </div>

      {/* Challenges List */}
      {error ? (
        <div className="text-center py-6">
          <Trophy className="w-8 h-8 text-night-500 mx-auto mb-2" />
          <p className="text-sm text-night-300">Coming soon</p>
          <p className="text-xs text-night-400 mt-1">Weekly challenges are being set up</p>
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-6">
          <Trophy className="w-8 h-8 text-night-500 mx-auto mb-2" />
          <p className="text-sm text-night-300">No active challenges</p>
          <p className="text-xs text-night-400 mt-1">
            {isModeratorUser ? 'Create a challenge to get started!' : 'Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((challenge) => {
            const joined = isJoined(challenge)
            const progress = getProgressPercent(challenge, userId)
            const typeInfo = CHALLENGE_TYPES[challenge.type] || CHALLENGE_TYPES.PROOFS
            const diffInfo = DIFFICULTY[challenge.difficulty] || DIFFICULTY.MEDIUM

            return (
              <div
                key={challenge.id}
                className="bg-night-700/50 rounded-lg p-3 space-y-3"
              >
                {/* Challenge Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{typeInfo.icon}</span>
                    <div>
                      <h4 className="text-sm font-medium text-white">{challenge.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-${diffInfo.color}-500/20 text-${diffInfo.color}-400`}>
                          {diffInfo.label}
                        </span>
                        <span className="text-xs text-night-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeLeft(challenge.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Participants Count */}
                  <span className="flex items-center gap-1 text-xs text-night-300">
                    <Users className="w-3 h-3" />
                    {challenge.participants?.length || 0}
                  </span>
                </div>

                {/* Description */}
                {challenge.description && (
                  <p className="text-xs text-night-300">{challenge.description}</p>
                )}

                {/* Progress or Join */}
                {joined ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-night-300">
                        {challenge.participants?.find(p => p.userId === userId)?.progress || 0} / {challenge.target} {typeInfo.metric}
                      </span>
                      <span className="text-brand-400">{progress}%</span>
                    </div>
                    <div className="h-2 bg-night-600 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={`h-full rounded-full ${
                          progress >= 100
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-brand-500 to-glow-500'
                        }`}
                      />
                    </div>
                    {progress >= 100 && (
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <Trophy className="w-3 h-3" />
                        Challenge completed!
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleJoinChallenge(challenge.id)}
                    disabled={actionLoading}
                    className="w-full py-2 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Join Challenge
                  </button>
                )}

                {/* View Leaderboard */}
                <button
                  onClick={() => setSelectedChallenge(challenge)}
                  className="flex items-center justify-between w-full text-xs text-night-400 hover:text-white transition-colors"
                >
                  <span>View Leaderboard</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Challenge Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateChallengeModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateChallenge}
            podName={podName}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {selectedChallenge && (
          <LeaderboardModal
            challenge={selectedChallenge}
            userId={userId}
            onClose={() => setSelectedChallenge(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Create Challenge Modal
function CreateChallengeModal({ onClose, onCreate, podName, loading }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('PROOFS')
  const [target, setTarget] = useState(7)
  const [duration, setDuration] = useState(7)

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate({
      title: title.trim() || `${podName} Challenge`,
      description: '',
      type,
      difficulty: 'MEDIUM',
      target,
      duration,
      reward: {
        badge: {
          name: `${title || podName} Champion`,
          icon: '🏆'
        }
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-night-800 border border-white/10 rounded-xl w-full max-w-[280px] shadow-xl"
      >
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Create Challenge</span>
            <button onClick={onClose} className="text-night-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Challenge name"
            className="w-full bg-night-700 rounded-lg px-3 py-2 text-xs text-white placeholder-night-500 border border-night-600 focus:border-glow-500 focus:outline-none"
            maxLength={50}
          />

          {/* Challenge Type - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(CHALLENGE_TYPES).map(([key, { label, icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all ${
                  type === key
                    ? 'bg-glow-500/20 text-white'
                    : 'bg-night-700/50 text-night-300 hover:bg-night-700'
                }`}
              >
                <span className="text-sm">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Target & Duration - Side by Side */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-night-400">Target</span>
                <span className="text-xs font-medium text-glow-400">{target}</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full h-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-night-400">Days</span>
                <span className="text-xs font-medium text-glow-400">{duration}</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-1"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="w-full py-2 bg-glow-500 hover:bg-glow-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Leaderboard Modal
function LeaderboardModal({ challenge, userId, onClose }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLeaderboard = async () => {
      const data = await getChallengeLeaderboard(challenge.id)
      setLeaderboard(data)
      setLoading(false)
    }
    loadLeaderboard()
  }, [challenge.id])

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return <Crown className="w-5 h-5 text-yellow-400" />
      case 1: return <Medal className="w-5 h-5 text-zinc-300" />
      case 2: return <Medal className="w-5 h-5 text-amber-600" />
      default: return <span className="text-sm text-night-400 w-5 text-center font-medium">{index + 1}</span>
    }
  }

  const getRankBg = (index) => {
    switch (index) {
      case 0: return 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20'
      case 1: return 'bg-gradient-to-r from-zinc-400/10 to-transparent border-zinc-400/20'
      case 2: return 'bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/20'
      default: return 'bg-night-700/30 border-white/5'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-b from-night-800 to-night-900 border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/50 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-glow-500/20 to-brand-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{CHALLENGE_TYPES[challenge.type]?.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-white">{challenge.title}</h2>
                <p className="text-sm text-night-300">Leaderboard</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-night-300" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-night-700/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-night-600 mx-auto mb-3" />
              <p className="text-night-400">No participants yet</p>
              <p className="text-xs text-night-500 mt-1">Be the first to join!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((participant, index) => {
                const isCurrentUser = participant.userId === userId
                const percent = Math.min(100, Math.floor((participant.progress / challenge.target) * 100))

                return (
                  <motion.div
                    key={participant.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isCurrentUser
                        ? 'bg-brand-500/10 border-brand-500/30 shadow-lg shadow-brand-500/5'
                        : getRankBg(index)
                    }`}
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {isCurrentUser ? 'You' : participant.userName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-brand-400">(you)</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-2 bg-night-600 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`h-full rounded-full ${
                              percent >= 100
                                ? 'bg-green-500'
                                : index === 0
                                  ? 'bg-yellow-500'
                                  : 'bg-brand-500'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-night-300 font-medium whitespace-nowrap">
                          {participant.progress}/{challenge.target}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
