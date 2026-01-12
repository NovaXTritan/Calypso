import { memo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, BookOpen, Heart, Trophy } from 'lucide-react'

const actions = [
  {
    to: '/pods',
    icon: CheckCircle,
    iconBg: 'bg-brand-500/20',
    iconColor: 'text-brand-400',
    title: 'Post Proof',
    subtitle: 'Share your progress'
  },
  {
    to: '/journal',
    icon: BookOpen,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    title: 'Journal',
    subtitle: 'Write a reflection'
  },
  {
    to: '/matches',
    icon: Heart,
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
    title: 'Find Partner',
    subtitle: 'Get accountability'
  },
  {
    to: '/leaderboard',
    icon: Trophy,
    iconBg: 'bg-yellow-500/20',
    iconColor: 'text-yellow-400',
    title: 'Leaderboard',
    subtitle: 'See top learners'
  }
]

function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-6"
    >
      <div className="glass p-4">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">QUICK ACTIONS</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map(({ to, icon: Icon, iconBg, iconColor, title, subtitle }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
            >
              <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <span className="text-sm font-medium text-white">{title}</span>
                <p className="text-xs text-zinc-500">{subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default memo(QuickActions)
