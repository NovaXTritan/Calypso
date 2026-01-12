// CelebrationContext.jsx - Global celebration system for milestones and achievements
import React, { createContext, useContext, useState, useCallback } from 'react'

const CelebrationContext = createContext(null)

// Celebration types with their configurations
export const CELEBRATION_TYPES = {
  STREAK_7: {
    id: 'streak_7',
    title: '1 Week Streak!',
    subtitle: "You've shown up for 7 days straight",
    icon: '🔥',
    color: 'from-orange-500 to-red-500',
    particleCount: 50,
    duration: 4000
  },
  STREAK_14: {
    id: 'streak_14',
    title: '2 Week Streak!',
    subtitle: 'Two weeks of consistency',
    icon: '⚡',
    color: 'from-yellow-500 to-orange-500',
    particleCount: 75,
    duration: 4500
  },
  STREAK_30: {
    id: 'streak_30',
    title: '30 Day Streak!',
    subtitle: 'A full month of dedication',
    icon: '💫',
    color: 'from-purple-500 to-pink-500',
    particleCount: 100,
    duration: 5000
  },
  STREAK_50: {
    id: 'streak_50',
    title: '50 Day Streak!',
    subtitle: 'Unstoppable momentum',
    icon: '🌟',
    color: 'from-blue-500 to-purple-500',
    particleCount: 125,
    duration: 5500
  },
  STREAK_100: {
    id: 'streak_100',
    title: '100 Day Streak!',
    subtitle: 'LEGENDARY commitment',
    icon: '👑',
    color: 'from-yellow-400 to-amber-500',
    particleCount: 200,
    duration: 6000
  },
  ACHIEVEMENT: {
    id: 'achievement',
    title: 'Achievement Unlocked!',
    subtitle: '',
    icon: '🏆',
    color: 'from-emerald-500 to-teal-500',
    particleCount: 60,
    duration: 4000
  },
  FIRST_PROOF: {
    id: 'first_proof',
    title: 'First Proof!',
    subtitle: 'Your journey begins',
    icon: '🚀',
    color: 'from-brand-500 to-glow-500',
    particleCount: 40,
    duration: 3500
  }
}

export function CelebrationProvider({ children }) {
  const [celebration, setCelebration] = useState(null)
  const [isActive, setIsActive] = useState(false)

  const celebrate = useCallback((type, customData = {}) => {
    const config = typeof type === 'string' ? CELEBRATION_TYPES[type] : type

    if (!config) {
      console.warn('Unknown celebration type:', type)
      return
    }

    // Merge custom data with config
    const celebrationData = {
      ...config,
      ...customData,
      timestamp: Date.now()
    }

    setCelebration(celebrationData)
    setIsActive(true)

    // Auto-dismiss after duration
    setTimeout(() => {
      setIsActive(false)
      setTimeout(() => setCelebration(null), 500) // Allow exit animation
    }, celebrationData.duration || 4000)
  }, [])

  const dismiss = useCallback(() => {
    setIsActive(false)
    setTimeout(() => setCelebration(null), 500)
  }, [])

  // Check if streak milestone was reached
  const checkStreakMilestone = useCallback((newStreak, oldStreak = 0) => {
    const milestones = [
      { streak: 100, type: 'STREAK_100' },
      { streak: 50, type: 'STREAK_50' },
      { streak: 30, type: 'STREAK_30' },
      { streak: 14, type: 'STREAK_14' },
      { streak: 7, type: 'STREAK_7' }
    ]

    for (const milestone of milestones) {
      if (newStreak >= milestone.streak && oldStreak < milestone.streak) {
        celebrate(milestone.type)
        return true
      }
    }
    return false
  }, [celebrate])

  // Celebrate achievement unlock
  const celebrateAchievement = useCallback((achievement) => {
    celebrate('ACHIEVEMENT', {
      title: achievement.name || 'Achievement Unlocked!',
      subtitle: achievement.description || '',
      icon: achievement.icon || '🏆'
    })
  }, [celebrate])

  const value = {
    celebration,
    isActive,
    celebrate,
    dismiss,
    checkStreakMilestone,
    celebrateAchievement
  }

  return (
    <CelebrationContext.Provider value={value}>
      {children}
    </CelebrationContext.Provider>
  )
}

export function useCelebration() {
  const context = useContext(CelebrationContext)
  if (!context) {
    throw new Error('useCelebration must be used within a CelebrationProvider')
  }
  return context
}

export default CelebrationContext
