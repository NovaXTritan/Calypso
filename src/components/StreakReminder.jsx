// StreakReminder.jsx - Shows streak reminder notification when user hasn't posted today
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { Flame, X, Clock, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTimeUntilMidnight, startOfDay, getDateKey } from '../utils/dateUtils'

export default function StreakReminder() {
  const { currentUser } = useAuth()
  const [showReminder, setShowReminder] = useState(false)
  const [streakData, setStreakData] = useState({ streak: 0, lastProofDate: null, hoursLeft: 24 })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!currentUser?.uid || dismissed) return

    // Check if user already dismissed today using consistent date comparison
    const dismissedKey = `streak_reminder_dismissed_${currentUser.uid}`
    const lastDismissed = localStorage.getItem(dismissedKey)
    if (lastDismissed) {
      const dismissedDateKey = getDateKey(parseInt(lastDismissed))
      const todayKey = getDateKey(new Date())
      if (dismissedDateKey === todayKey) {
        return
      }
    }

    const checkStreakStatus = async () => {
      try {
        // Get user's latest proof using proper start of day calculation
        const todayStart = startOfDay(new Date())
        const todayTimestamp = todayStart.getTime()

        // Check if user posted today - use simpler query to avoid index issues
        let todaySnapshot
        try {
          const todayProofsQuery = query(
            collection(db, 'proofs'),
            where('authorId', '==', currentUser.uid),
            where('createdAt', '>=', todayTimestamp)
          )
          todaySnapshot = await getDocs(todayProofsQuery)
        } catch (indexError) {
          // Index might not exist, skip today check
          console.warn('StreakReminder: Index may be required for proofs query')
          todaySnapshot = { size: 0 }
        }

        if (todaySnapshot.size > 0) {
          // User already posted today, no reminder needed
          setShowReminder(false)
          return
        }

        // Get user's last proof date
        let lastProofSnapshot = { empty: true, docs: [] }
        try {
          const lastProofQuery = query(
            collection(db, 'proofs'),
            where('authorId', '==', currentUser.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
          )
          lastProofSnapshot = await getDocs(lastProofQuery)
        } catch (indexError) {
          console.warn('StreakReminder: Index may be required for last proof query')
        }

        const currentStreak = currentUser.streak || 0

        if (currentStreak > 0) {
          // Calculate hours left until midnight using proper DST-aware utility
          const timeUntilMidnight = getTimeUntilMidnight()
          // Add 1 if there are remaining minutes (show "8 hours" not "7 hours" if 7h 59m left)
          const hoursLeft = timeUntilMidnight.minutes > 0
            ? timeUntilMidnight.hours + 1
            : timeUntilMidnight.hours

          let lastProofDate = null
          if (!lastProofSnapshot.empty) {
            lastProofDate = lastProofSnapshot.docs[0].data().createdAt
          }

          setStreakData({
            streak: currentStreak,
            lastProofDate,
            hoursLeft
          })

          // Show reminder if streak > 0 and less than 8 hours left
          if (hoursLeft <= 8) {
            setShowReminder(true)
          }
        }
      } catch (error) {
        // Silently fail - streak reminder is not critical
        console.warn('StreakReminder: Error checking streak status', error.message)
      }
    }

    checkStreakStatus()

    // Check every 30 minutes
    const interval = setInterval(checkStreakStatus, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentUser?.uid, currentUser?.streak, dismissed])

  const handleDismiss = () => {
    const dismissedKey = `streak_reminder_dismissed_${currentUser.uid}`
    localStorage.setItem(dismissedKey, Date.now().toString())
    setDismissed(true)
    setShowReminder(false)
  }

  if (!showReminder) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <div className="glass border border-orange-500/30 rounded-xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              {streakData.hoursLeft <= 4 ? (
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              ) : (
                <Flame className="w-5 h-5 text-orange-400" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white mb-1">
                {streakData.hoursLeft <= 4 ? 'Your streak is at risk!' : 'Keep your streak alive!'}
              </h3>
              <p className="text-sm text-zinc-400 mb-3">
                {streakData.hoursLeft <= 4 ? (
                  <>Only <span className="text-orange-400 font-medium">{streakData.hoursLeft} hours</span> left to maintain your <span className="text-orange-400 font-medium">{streakData.streak}-day</span> streak!</>
                ) : (
                  <>Post a proof to keep your <span className="text-orange-400 font-medium">{streakData.streak}-day</span> streak going!</>
                )}
              </p>

              <div className="flex items-center gap-3">
                <Link
                  to="/pods"
                  onClick={handleDismiss}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm font-medium transition-colors"
                >
                  <Flame className="w-4 h-4" />
                  Post Now
                </Link>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {streakData.hoursLeft}h remaining
                </div>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
