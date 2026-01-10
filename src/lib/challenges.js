// challenges.js - Weekly Challenges system
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  increment
} from 'firebase/firestore'
import { db } from './firebase'

// Challenge types
export const CHALLENGE_TYPES = {
  STREAK: {
    label: 'Streak Challenge',
    icon: '🔥',
    description: 'Maintain a daily streak',
    metric: 'days'
  },
  PROOFS: {
    label: 'Proof Challenge',
    icon: '📸',
    description: 'Submit a number of proofs',
    metric: 'proofs'
  },
  TIME: {
    label: 'Time Challenge',
    icon: '⏰',
    description: 'Log focus hours',
    metric: 'hours'
  },
  COMMUNITY: {
    label: 'Community Challenge',
    icon: '🤝',
    description: 'Engage with the community',
    metric: 'interactions'
  }
}

// Difficulty levels with multipliers
export const DIFFICULTY = {
  EASY: { label: 'Easy', multiplier: 1, color: 'green' },
  MEDIUM: { label: 'Medium', multiplier: 1.5, color: 'yellow' },
  HARD: { label: 'Hard', multiplier: 2, color: 'orange' },
  LEGENDARY: { label: 'Legendary', multiplier: 3, color: 'purple' }
}

// Create a new challenge (moderator only)
export async function createChallenge(userId, challengeData) {
  try {
    const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Calculate end date (default 7 days)
    const duration = challengeData.duration || 7
    const startDate = challengeData.startDate || Date.now()
    const endDate = startDate + (duration * 24 * 60 * 60 * 1000)

    const challenge = {
      id: challengeId,
      createdBy: userId,
      podSlug: challengeData.podSlug,
      title: challengeData.title,
      description: challengeData.description || '',
      type: challengeData.type || 'PROOFS',
      difficulty: challengeData.difficulty || 'MEDIUM',
      target: challengeData.target || 7, // Target number to achieve
      reward: challengeData.reward || null, // Badge or XP reward
      participants: [],
      completions: [],
      startDate,
      endDate,
      status: 'active',
      createdAt: serverTimestamp()
    }

    await setDoc(doc(db, 'challenges', challengeId), challenge)

    return { success: true, challengeId }
  } catch (error) {
    console.error('Error creating challenge:', error)
    return { success: false, error: error.message }
  }
}

// Join a challenge
export async function joinChallenge(challengeId, userId, userName) {
  try {
    const challengeRef = doc(db, 'challenges', challengeId)
    const challengeDoc = await getDoc(challengeRef)

    if (!challengeDoc.exists()) {
      return { success: false, error: 'Challenge not found' }
    }

    const challenge = challengeDoc.data()

    // Check if challenge is still active
    if (challenge.endDate < Date.now()) {
      return { success: false, error: 'Challenge has ended' }
    }

    // Check if already joined
    if (challenge.participants.some(p => p.userId === userId)) {
      return { success: false, error: 'Already joined' }
    }

    const participant = {
      userId,
      userName: userName || 'Anonymous',
      joinedAt: Date.now(),
      progress: 0
    }

    await updateDoc(challengeRef, {
      participants: arrayUnion(participant)
    })

    // Create user challenge record
    await setDoc(doc(db, 'userChallenges', `${challengeId}_${userId}`), {
      challengeId,
      userId,
      progress: 0,
      completed: false,
      joinedAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error joining challenge:', error)
    return { success: false, error: error.message }
  }
}

// Update challenge progress
export async function updateProgress(challengeId, userId, progressIncrement) {
  try {
    const challengeRef = doc(db, 'challenges', challengeId)
    const challengeDoc = await getDoc(challengeRef)

    if (!challengeDoc.exists()) {
      return { success: false, error: 'Challenge not found' }
    }

    const challenge = challengeDoc.data()

    // Check if challenge is still active
    if (challenge.endDate < Date.now()) {
      return { success: false, error: 'Challenge has ended' }
    }

    // Find participant
    const participantIndex = challenge.participants.findIndex(p => p.userId === userId)
    if (participantIndex === -1) {
      return { success: false, error: 'Not participating in this challenge' }
    }

    // Update progress
    const updatedParticipants = [...challenge.participants]
    const currentProgress = updatedParticipants[participantIndex].progress || 0
    const newProgress = currentProgress + progressIncrement

    updatedParticipants[participantIndex] = {
      ...updatedParticipants[participantIndex],
      progress: newProgress
    }

    // Check if completed
    let completionData = null
    if (newProgress >= challenge.target && !challenge.completions.some(c => c.userId === userId)) {
      completionData = {
        userId,
        completedAt: Date.now(),
        finalProgress: newProgress
      }

      await updateDoc(challengeRef, {
        participants: updatedParticipants,
        completions: arrayUnion(completionData)
      })

      // Award badge/reward
      if (challenge.reward) {
        await awardChallengeReward(userId, challenge)
      }
    } else {
      await updateDoc(challengeRef, {
        participants: updatedParticipants
      })
    }

    // Update user challenge record
    const userChallengeRef = doc(db, 'userChallenges', `${challengeId}_${userId}`)
    await updateDoc(userChallengeRef, {
      progress: newProgress,
      completed: newProgress >= challenge.target,
      completedAt: newProgress >= challenge.target ? serverTimestamp() : null
    })

    return {
      success: true,
      newProgress,
      completed: newProgress >= challenge.target,
      target: challenge.target
    }
  } catch (error) {
    console.error('Error updating progress:', error)
    return { success: false, error: error.message }
  }
}

// Award challenge reward
async function awardChallengeReward(userId, challenge) {
  try {
    const userRef = doc(db, 'users', userId)
    const difficultyMultiplier = DIFFICULTY[challenge.difficulty]?.multiplier || 1

    // Award XP
    const xpReward = Math.floor(100 * difficultyMultiplier)
    await updateDoc(userRef, {
      xp: increment(xpReward),
      challengesCompleted: increment(1)
    })

    // Award badge
    if (challenge.reward?.badge) {
      const badge = {
        id: `challenge_${challenge.id}`,
        name: challenge.reward.badge.name || `${challenge.title} Completed`,
        description: challenge.reward.badge.description || `Completed the ${challenge.title} challenge`,
        icon: challenge.reward.badge.icon || '🏆',
        awardedAt: Date.now(),
        challengeId: challenge.id
      }

      await updateDoc(userRef, {
        badges: arrayUnion(badge)
      })
    }

    // Create notification
    await setDoc(doc(collection(db, 'notifications')), {
      userId,
      type: 'challenge_completed',
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      xpReward,
      message: `You completed the "${challenge.title}" challenge! +${xpReward} XP`,
      read: false,
      createdAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error awarding reward:', error)
    return { success: false, error: error.message }
  }
}

// Get active challenges for a pod
export async function getActiveChallenges(podSlug) {
  try {
    const now = Date.now()
    const challengesQuery = query(
      collection(db, 'challenges'),
      where('podSlug', '==', podSlug),
      where('status', '==', 'active'),
      orderBy('endDate', 'asc')
    )

    const snapshot = await getDocs(challengesQuery)
    const challenges = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(c => c.endDate > now) // Filter out expired

    return challenges
  } catch (error) {
    console.error('Error getting challenges:', error)
    return []
  }
}

// Get user's challenge progress
export async function getUserChallengeProgress(userId, challengeId) {
  try {
    const userChallengeRef = doc(db, 'userChallenges', `${challengeId}_${userId}`)
    const userChallengeDoc = await getDoc(userChallengeRef)

    if (!userChallengeDoc.exists()) {
      return null
    }

    return userChallengeDoc.data()
  } catch (error) {
    console.error('Error getting user challenge:', error)
    return null
  }
}

// Get leaderboard for a challenge
export async function getChallengeLeaderboard(challengeId) {
  try {
    const challengeRef = doc(db, 'challenges', challengeId)
    const challengeDoc = await getDoc(challengeRef)

    if (!challengeDoc.exists()) {
      return []
    }

    const challenge = challengeDoc.data()
    const participants = challenge.participants || []

    // Sort by progress descending
    return participants
      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
      .slice(0, 10) // Top 10
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    return []
  }
}

// Auto-update challenge progress based on proof submission
export async function onProofSubmit(userId, podSlug) {
  try {
    // Get all active challenges for this pod
    const challenges = await getActiveChallenges(podSlug)

    for (const challenge of challenges) {
      // Check if user is participating
      const isParticipant = challenge.participants.some(p => p.userId === userId)
      if (!isParticipant) continue

      // Update progress based on challenge type
      if (challenge.type === 'PROOFS') {
        await updateProgress(challenge.id, userId, 1)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error auto-updating challenge:', error)
    return { success: false, error: error.message }
  }
}
