import { memo } from 'react'
import { Lightbulb, Zap, Heart, Target, Star, Users, BookOpen, Sparkles, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

const DAILY_TIPS = [
  { icon: Lightbulb, text: "Break big goals into tiny daily actions. 2 minutes is all you need to start.", color: "text-yellow-400" },
  { icon: Zap, text: "The best time to post a proof is right after you finish learning - capture that momentum!", color: "text-brand-400" },
  { icon: Heart, text: "React to others' proofs. Building community makes learning stick.", color: "text-pink-400" },
  { icon: Target, text: "Focus on consistency over intensity. Small daily wins compound.", color: "text-green-400" },
  { icon: Star, text: "Celebrate small wins. Each proof is evidence of your growth.", color: "text-glow-400" },
  { icon: Users, text: "Find an accountability partner. You're 65% more likely to reach goals together.", color: "text-purple-400" },
  { icon: BookOpen, text: "Reflect on what you learned, not just what you did. Insight builds wisdom.", color: "text-blue-400" },
  { icon: Sparkles, text: "Quality beats quantity. One thoughtful proof beats five rushed ones.", color: "text-cyan-400" }
]

function DailyTip({ tip, onNextTip }) {
  const TipIcon = tip.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-6"
    >
      <div className="glass p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <TipIcon className={`w-5 h-5 ${tip.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-400">DAILY TIP</span>
            <Sparkles className="w-3 h-3 text-yellow-400" />
          </div>
          <p className="text-sm text-zinc-200">{tip.text}</p>
        </div>
        <button
          onClick={onNextTip}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title="Next tip"
          aria-label="Show next tip"
        >
          <RefreshCw className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </motion.div>
  )
}

export { DAILY_TIPS }
export default memo(DailyTip)
