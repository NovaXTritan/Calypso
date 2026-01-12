import { memo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Heart, ArrowRight } from 'lucide-react'
import Card from '../Card'

function ActivityFeed({ activities, loading }) {
  const formatRelativeTime = useCallback((timestamp) => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <Card title="Community Activity">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-3 bg-zinc-700 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto hide-scrollbar">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
                  {activity.authorName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium text-white">{activity.authorName || 'Someone'}</span>
                    {' '}posted in{' '}
                    <span className="text-brand-400">{activity.podName || 'a pod'}</span>
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{activity.content}</p>
                  <span className="text-xs text-zinc-600">{formatRelativeTime(activity.createdAt)}</span>
                </div>
                {activity.reactions && Object.keys(activity.reactions).length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Heart className="w-3 h-3" />
                    {Object.values(activity.reactions).reduce((a, b) => a + b.length, 0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No recent activity</p>
            <p className="text-xs text-zinc-500 mt-1">Be the first to post a proof today!</p>
          </div>
        )}
        {activities.length > 0 && (
          <Link to="/pods" className="mt-3 flex items-center justify-center gap-1 text-sm text-brand-400 hover:text-brand-300">
            View all activity <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </Card>
    </motion.div>
  )
}

export default memo(ActivityFeed)
