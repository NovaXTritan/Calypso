import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import FannedCardStack from '../ui/FannedCardStack'
import { ArrowRight } from 'lucide-react'

/**
 * WeeklyShowcase - Shows visual card stacks for weekly activity
 * Uses FannedCardStack to display learner avatars, pod activity, etc.
 */
function WeeklyShowcase({ activities, leaderboard, userStats, achievements }) {
  // Extract unique user avatars from activities
  const activeLearnersImages = useMemo(() => {
    if (!activities || activities.length === 0) return []

    // Get unique authors with their avatar URLs
    const seen = new Set()
    const avatars = []

    for (const activity of activities) {
      if (activity.authorId && !seen.has(activity.authorId)) {
        seen.add(activity.authorId)
        // Use photoURL if available, otherwise generate gradient avatar placeholder
        avatars.push(
          activity.authorPhotoURL ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activity.authorName || 'User')}&backgroundColor=667dff,ffb36b&backgroundType=gradientLinear`
        )
      }
      if (avatars.length >= 4) break
    }

    return avatars
  }, [activities])

  // Get leaderboard user avatars
  const topStreakImages = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return []

    return leaderboard.slice(0, 4).map(user =>
      user.photoURL ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'User')}&backgroundColor=667dff,ffb36b&backgroundType=gradientLinear`
    )
  }, [leaderboard])

  // Get achievement icons as images (using emoji to PNG service)
  const achievementImages = useMemo(() => {
    if (!achievements || achievements.length === 0) return []

    return achievements.slice(0, 4).map(achievement =>
      `https://api.dicebear.com/7.x/shapes/svg?seed=${achievement.id}&backgroundColor=667dff,ffb36b&backgroundType=gradientLinear`
    )
  }, [achievements])

  // If no data available, don't render
  if (activeLearnersImages.length === 0 && topStreakImages.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">This Week's Highlights</h2>
        <Link
          to="/leaderboard"
          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Active Learners Card */}
        {activeLearnersImages.length >= 2 && (
          <FannedCardStack
            images={activeLearnersImages}
            title="THIS WEEK"
            subtitle="Active Learners"
            count={activities?.length || 0}
            onClick={() => {}}
          />
        )}

        {/* Top Streaks Card */}
        {topStreakImages.length >= 2 && (
          <FannedCardStack
            images={topStreakImages}
            title="LEADERBOARD"
            subtitle="Top Streaks"
            badge={leaderboard?.[0] ? `${leaderboard[0].streak || 0} days` : undefined}
            onClick={() => {}}
          />
        )}

        {/* User's Progress Card */}
        {userStats && userStats.streak > 0 && (
          <FannedCardStack
            images={[
              `https://api.dicebear.com/7.x/shapes/svg?seed=streak${userStats.streak}&backgroundColor=ffb36b&backgroundType=gradientLinear`,
              `https://api.dicebear.com/7.x/shapes/svg?seed=proofs${userStats.totalProofs}&backgroundColor=667dff&backgroundType=gradientLinear`,
              `https://api.dicebear.com/7.x/shapes/svg?seed=weekly${userStats.weeklyProofs}&backgroundColor=ffb36b,667dff&backgroundType=gradientLinear`
            ]}
            title="YOUR PROGRESS"
            subtitle="Keep Going!"
            count={userStats.weeklyProofs}
            badge={`${userStats.streak} day streak`}
            onClick={() => {}}
          />
        )}

        {/* Achievements Card - if user has achievements */}
        {achievements && achievements.length >= 2 && (
          <FannedCardStack
            images={achievementImages}
            title="EARNED"
            subtitle="Achievements"
            count={achievements.length}
            onClick={() => {}}
          />
        )}
      </div>
    </motion.div>
  )
}

export default memo(WeeklyShowcase)
