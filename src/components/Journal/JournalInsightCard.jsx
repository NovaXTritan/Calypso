import React from 'react'
import { Heart, AlertTriangle, TrendingUp, Info, Zap } from 'lucide-react'

const TYPE_CONFIG = {
  strength: {
    border: 'border-green-500/40',
    bg: 'bg-green-500/10',
    icon: TrendingUp,
    iconColor: 'text-green-400',
    label: 'Strength',
  },
  pattern: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    icon: Info,
    iconColor: 'text-blue-400',
    label: 'Pattern',
  },
  misalignment: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    label: 'Misalignment',
  },
  concern: {
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    label: 'Concern',
  },
  burnout: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    icon: Heart,
    iconColor: 'text-red-400',
    label: 'Burnout Risk',
  },
}

const SEVERITY_BADGE = {
  low: 'bg-zinc-500/20 text-zinc-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-red-500/20 text-red-400',
}

export default function JournalInsightCard({ type, severity, title, insight, suggestion }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.pattern
  const Icon = config.icon

  return (
    <div className={`glass rounded-xl border-l-4 ${config.border} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${SEVERITY_BADGE[severity] || SEVERITY_BADGE.low}`}>
              {severity}
            </span>
          </div>
          <p className="text-sm text-zinc-300 mb-2 leading-relaxed">{insight}</p>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/5">
            <Zap className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-400 leading-relaxed">{suggestion}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
