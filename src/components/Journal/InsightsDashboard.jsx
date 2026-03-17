import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import useInsights from '../../hooks/useInsights'
import JournalInsightCard from './JournalInsightCard'
import { motion } from 'framer-motion'
import { BarChart3, Sparkles, RefreshCw, Beaker, MessageSquareQuote, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

function AlignmentGauge({ score }) {
  const getColor = () => {
    if (score >= 80) return { ring: 'text-green-400', bg: 'bg-green-500/20', label: 'Well Aligned', labelColor: 'text-green-400' }
    if (score >= 60) return { ring: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Some Drift', labelColor: 'text-yellow-400' }
    if (score >= 40) return { ring: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Significant Misalignment', labelColor: 'text-orange-400' }
    return { ring: 'text-red-400', bg: 'bg-red-500/20', label: 'Major Concern', labelColor: 'text-red-400' }
  }

  const config = getColor()
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${config.ring} transition-all duration-1000`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}</span>
          <span className="text-[10px] text-zinc-400">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-medium mt-2 ${config.labelColor}`}>{config.label}</span>
    </div>
  )
}

function AllocationChart({ actual, focusAreas }) {
  if (!actual || Object.keys(actual).length === 0) return null

  const allAreas = new Set([
    ...Object.keys(actual),
    ...(focusAreas || []).map((fa) => fa.area),
  ])

  const maxHours = Math.max(
    ...Object.values(actual),
    ...(focusAreas || []).map((fa) => fa.targetHoursPerWeek),
    1
  )

  return (
    <div className="space-y-3">
      {[...allAreas].map((area) => {
        const actualHours = actual[area] || 0
        const target = focusAreas?.find(
          (fa) => fa.area.toLowerCase() === area.toLowerCase()
        )
        const targetHours = target?.targetHoursPerWeek || 0

        return (
          <div key={area}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-400">{area}</span>
              <span className="text-xs text-zinc-500">
                {actualHours}h / {targetHours}h target
              </span>
            </div>
            <div className="relative h-4 bg-white/5 rounded-full overflow-hidden">
              {targetHours > 0 && (
                <div
                  className="absolute top-0 h-full bg-white/10 rounded-full"
                  style={{ width: `${Math.min((targetHours / maxHours) * 100, 100)}%` }}
                />
              )}
              <div
                className={`absolute top-0 h-full rounded-full transition-all duration-700 ${
                  actualHours >= targetHours ? 'bg-green-500/60' : 'bg-brand-500/60'
                }`}
                style={{ width: `${Math.min((actualHours / maxHours) * 100, 100)}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-500/60" />
          <span className="text-[10px] text-zinc-500">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="text-[10px] text-zinc-500">Target</span>
        </div>
      </div>
    </div>
  )
}

function BalanceBadge({ status, message }) {
  const config = {
    healthy: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    concern: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  }

  const c = config[status] || config.warning

  return (
    <div className={`p-3 rounded-xl border ${c.border} ${c.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Activity className={`w-4 h-4 ${c.text}`} />
        <span className={`text-sm font-medium ${c.text} capitalize`}>{status}</span>
      </div>
      <p className="text-xs text-zinc-300 leading-relaxed">{message}</p>
    </div>
  )
}

export default function InsightsDashboard() {
  const { currentUser } = useAuth()
  const { latestInsight, loading, analyzing, error, analyzeNow } = useInsights(
    currentUser?.uid
  )

  async function handleAnalyze() {
    try {
      await analyzeNow()
      toast.success('Analysis generated!')
    } catch {
      toast.error(error || 'Failed to generate analysis')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!latestInsight) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-brand-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
        <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
          Your first weekly insight will be generated this Sunday. Make sure you have at least 3 journal entries by then!
        </p>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Analyze Now
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
      </div>
    )
  }

  const { analysis } = latestInsight
  const generatedAt = latestInsight.generatedAt?.toDate?.()
    ? latestInsight.generatedAt.toDate().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Recently'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-400" />
            Weekly Insight
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Generated {generatedAt}</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-zinc-400 transition flex items-center gap-2 disabled:opacity-50"
        >
          {analyzing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {analyzing ? 'Analyzing...' : 'Analyze Now'}
        </button>
      </div>

      {/* Alignment Score + Allocation */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl flex flex-col items-center justify-center">
          <AlignmentGauge score={analysis.alignmentScore} />
          <p className="text-xs text-zinc-500 mt-3 text-center">
            Based on {latestInsight.journalEntriesAnalyzed} journal entries
          </p>
        </div>

        <div className="glass p-6 rounded-2xl">
          <h4 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Actual vs Target
          </h4>
          <AllocationChart actual={analysis.actualAllocation} />
        </div>
      </div>

      {/* Key Insights */}
      {analysis.keyInsights?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-3">Key Insights</h4>
          <div className="space-y-3">
            {analysis.keyInsights.map((insight, i) => (
              <JournalInsightCard key={i} {...insight} />
            ))}
          </div>
        </div>
      )}

      {/* Balance Check + Weekly Experiment */}
      <div className="grid md:grid-cols-2 gap-4">
        {analysis.balanceCheck && (
          <BalanceBadge
            status={analysis.balanceCheck.status}
            message={analysis.balanceCheck.message}
          />
        )}

        {analysis.weeklyExperiment && (
          <div className="p-3 rounded-xl border border-brand-500/30 bg-brand-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Beaker className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-brand-400">This Week's Experiment</span>
            </div>
            <p className="text-xs text-zinc-300 mb-1">{analysis.weeklyExperiment.description}</p>
            <p className="text-[10px] text-zinc-500">
              Measure: {analysis.weeklyExperiment.measurable}
            </p>
          </div>
        )}
      </div>

      {/* Compassionate Note */}
      {analysis.compassionateNote && (
        <div className="glass p-4 rounded-2xl border border-white/5">
          <div className="flex items-start gap-3">
            <MessageSquareQuote className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-300 italic leading-relaxed">
              {analysis.compassionateNote}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
