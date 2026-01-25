// achievements.js - Achievement and badge system
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from './firebase'

// Achievement definitions
export const ACHIEVEMENTS = {
  // Streak achievements
  FIRST_STREAK: {
    id: 'first_streak',
    name: 'First Flame',
    description: 'Start your first streak',
    icon: '🔥',
    requirement: 1,
    type: 'streak'
  },
  WEEK_STREAK: {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    requirement: 7,
    type: 'streak'
  },
  MONTH_STREAK: {
    id: 'month_streak',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '🏆',
    requirement: 30,
    type: 'streak'
  },
  CENTURY_STREAK: {
    id: 'century_streak',
    name: 'Century Club',
    description: 'Maintain a 100-day streak',
    icon: '💯',
    requirement: 100,
    type: 'streak'
  },

  // Proof achievements
  FIRST_PROOF: {
    id: 'first_proof',
    name: 'First Step',
    description: 'Post your first proof',
    icon: '📝',
    requirement: 1,
    type: 'proofs'
  },
  TEN_PROOFS: {
    id: 'ten_proofs',
    name: 'Getting Started',
    description: 'Post 10 proofs',
    icon: '📚',
    requirement: 10,
    type: 'proofs'
  },
  FIFTY_PROOFS: {
    id: 'fifty_proofs',
    name: 'Consistent Learner',
    description: 'Post 50 proofs',
    icon: '🎯',
    requirement: 50,
    type: 'proofs'
  },
  HUNDRED_PROOFS: {
    id: 'hundred_proofs',
    name: 'Proof Pioneer',
    description: 'Post 100 proofs',
    icon: '🌟',
    requirement: 100,
    type: 'proofs'
  },

  // Community achievements
  FIRST_POD: {
    id: 'first_pod',
    name: 'Pod Explorer',
    description: 'Join your first pod',
    icon: '🚀',
    requirement: 1,
    type: 'pods'
  },
  FIVE_PODS: {
    id: 'five_pods',
    name: 'Community Builder',
    description: 'Join 5 pods',
    icon: '🌐',
    requirement: 5,
    type: 'pods'
  },
  FIRST_PARTNER: {
    id: 'first_partner',
    name: 'Accountability Buddy',
    description: 'Get your first accountability partner',
    icon: '🤝',
    requirement: 1,
    type: 'partners'
  },
  VERIFIED_PROOF: {
    id: 'verified_proof',
    name: 'Verified Creator',
    description: 'Get a proof verified by the community',
    icon: '✅',
    requirement: 1,
    type: 'verified'
  },

  // Special achievements
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Post a proof before 8 AM',
    icon: '🌅',
    requirement: 1,
    type: 'special'
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Post a proof after 11 PM',
    icon: '🦉',
    requirement: 1,
    type: 'special'
  },
  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Post proofs on 4 consecutive weekends',
    icon: '🎉',
    requirement: 4,
    type: 'special'
  }
}

// Check and award achievements
export async function checkAchievements(userId, stats, context = {}) {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) return []

    const userData = userDoc.data()
    const existingAchievements = userData.achievements || []
    const newAchievements = []

    // Check streak achievements
    const streakAchievements = ['FIRST_STREAK', 'WEEK_STREAK', 'MONTH_STREAK', 'CENTURY_STREAK']
    for (const key of streakAchievements) {
      const achievement = ACHIEVEMENTS[key]
      if (!existingAchievements.includes(achievement.id) && stats.streak >= achievement.requirement) {
        newAchievements.push(achievement)
      }
    }

    // Check proof achievements
    const proofAchievements = ['FIRST_PROOF', 'TEN_PROOFS', 'FIFTY_PROOFS', 'HUNDRED_PROOFS']
    for (const key of proofAchievements) {
      const achievement = ACHIEVEMENTS[key]
      if (!existingAchievements.includes(achievement.id) && stats.totalProofs >= achievement.requirement) {
        newAchievements.push(achievement)
      }
    }

    // Check pod achievements
    const podAchievements = ['FIRST_POD', 'FIVE_PODS']
    for (const key of podAchievements) {
      const achievement = ACHIEVEMENTS[key]
      if (!existingAchievements.includes(achievement.id) && stats.podsJoined >= achievement.requirement) {
        newAchievements.push(achievement)
      }
    }

    // Check partner achievements
    if (stats.partnersCount !== undefined && stats.partnersCount >= 1) {
      if (!existingAchievements.includes(ACHIEVEMENTS.FIRST_PARTNER.id)) {
        newAchievements.push(ACHIEVEMENTS.FIRST_PARTNER)
      }
    }

    // Check time-based achievements when posting a proof
    if (context.justPostedProof) {
      const now = new Date()
      const hour = now.getHours()

      // Early Bird: posted before 8 AM
      if (hour < 8 && !existingAchievements.includes(ACHIEVEMENTS.EARLY_BIRD.id)) {
        newAchievements.push(ACHIEVEMENTS.EARLY_BIRD)
      }

      // Night Owl: posted after 11 PM
      if (hour >= 23 && !existingAchievements.includes(ACHIEVEMENTS.NIGHT_OWL.id)) {
        newAchievements.push(ACHIEVEMENTS.NIGHT_OWL)
      }
    }

    // Award new achievements
    if (newAchievements.length > 0) {
      await updateDoc(userRef, {
        achievements: arrayUnion(...newAchievements.map(a => a.id))
      })
    }

    return newAchievements
  } catch (error) {
    console.error('Error checking achievements:', error)
    return []
  }
}

// Get user's achievements with details
export function getUserAchievements(achievementIds = []) {
  return achievementIds.map(id => {
    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === id)
    return achievement || null
  }).filter(Boolean)
}

// Get all achievements with unlock status
export function getAllAchievementsWithStatus(unlockedIds = []) {
  return Object.values(ACHIEVEMENTS).map(achievement => ({
    ...achievement,
    unlocked: unlockedIds.includes(achievement.id)
  }))
}

// Calculate achievement progress
export function getAchievementProgress(stats) {
  const progress = {}

  Object.entries(ACHIEVEMENTS).forEach(([key, achievement]) => {
    let current = 0
    switch (achievement.type) {
      case 'streak':
        current = stats.streak || 0
        break
      case 'proofs':
        current = stats.totalProofs || 0
        break
      case 'pods':
        current = stats.podsJoined || 0
        break
      default:
        current = 0
    }

    progress[achievement.id] = {
      current,
      required: achievement.requirement,
      percentage: Math.min(100, Math.round((current / achievement.requirement) * 100))
    }
  })

  return progress
}
