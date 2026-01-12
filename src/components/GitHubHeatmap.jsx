import React, { useMemo } from 'react'
import { Flame } from 'lucide-react'

/**
 * GitHub-style contribution heatmap showing activity over the past year
 *
 * @param {Object} props
 * @param {Array} props.activityData - Array of { date: timestamp, count: number }
 * @param {number} props.currentStreak - Current streak count
 * @param {number} props.longestStreak - Longest streak ever
 */
export default function GitHubHeatmap({ activityData = [], currentStreak = 0, longestStreak = 0 }) {
  const weeks = 53
  const days = 7

  // Process activity data into a date -> count map
  const activityMap = useMemo(() => {
    const map = new Map()

    activityData.forEach(item => {
      const date = item.date?.toDate ? item.date.toDate() : new Date(item.date)
      const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD
      map.set(dateKey, (map.get(dateKey) || 0) + (item.count || 1))
    })

    return map
  }, [activityData])

  // Generate the grid data for the past 52 weeks
  const gridData = useMemo(() => {
    const today = new Date()
    const grid = []

    // Find the first day (Sunday) of 52 weeks ago
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (weeks * 7) + (7 - today.getDay()))

    for (let w = 0; w < weeks; w++) {
      const week = []
      for (let d = 0; d < days; d++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + (w * 7) + d)

        const dateKey = currentDate.toISOString().split('T')[0]
        const count = activityMap.get(dateKey) || 0
        const isFuture = currentDate > today

        week.push({
          date: currentDate,
          dateKey,
          count,
          isFuture,
          level: isFuture ? -1 : getActivityLevel(count)
        })
      }
      grid.push(week)
    }

    return grid
  }, [activityMap, weeks, days])

  // Calculate stats
  const stats = useMemo(() => {
    let totalActivity = 0
    let activeDays = 0
    let maxInDay = 0

    activityMap.forEach(count => {
      totalActivity += count
      activeDays++
      if (count > maxInDay) maxInDay = count
    })

    return { totalActivity, activeDays, maxInDay }
  }, [activityMap])

  // Get activity level (0-4) based on count
  function getActivityLevel(count) {
    if (count === 0) return 0
    if (count === 1) return 1
    if (count === 2) return 2
    if (count <= 4) return 3
    return 4
  }

  // Get color class based on activity level
  function getColor(level) {
    switch (level) {
      case -1: return 'bg-zinc-800/30' // Future
      case 0: return 'bg-zinc-800/60'
      case 1: return 'bg-brand-400/40'
      case 2: return 'bg-brand-500/60'
      case 3: return 'bg-brand-500/80'
      case 4: return 'bg-brand-600'
      default: return 'bg-zinc-800/60'
    }
  }

  // Format date for tooltip
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels = []
    let lastMonth = -1

    gridData.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date
      const month = firstDayOfWeek.getMonth()

      if (month !== lastMonth) {
        labels.push({
          month: firstDayOfWeek.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex
        })
        lastMonth = month
      }
    })

    return labels
  }, [gridData])

  return (
    <div className="glass p-5 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="text-glow-500" size={20} />
            Activity Heatmap
          </h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            {stats.totalActivity} proofs in the last year
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className={`w-3 h-3 rounded-sm ${getColor(i)}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Streak Stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <Flame className="text-glow-500" size={16} />
          <span className="text-zinc-400">Current:</span>
          <span className="font-semibold text-white">{currentStreak} days</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Longest:</span>
          <span className="font-semibold text-white">{longestStreak} days</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">Active days:</span>
          <span className="font-semibold text-white">{stats.activeDays}</span>
        </div>
      </div>

      {/* Month Labels */}
      <div className="flex gap-[3px] ml-8 mb-1 text-xs text-zinc-500">
        {monthLabels.map((label, i) => (
          <div
            key={i}
            className="absolute"
            style={{ marginLeft: `${label.weekIndex * 15}px` }}
          >
            {label.month}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] text-xs text-zinc-500 pr-2">
          <span className="h-3 sm:h-3.5 md:h-4"></span>
          <span className="h-3 sm:h-3.5 md:h-4 flex items-center">Mon</span>
          <span className="h-3 sm:h-3.5 md:h-4"></span>
          <span className="h-3 sm:h-3.5 md:h-4 flex items-center">Wed</span>
          <span className="h-3 sm:h-3.5 md:h-4"></span>
          <span className="h-3 sm:h-3.5 md:h-4 flex items-center">Fri</span>
          <span className="h-3 sm:h-3.5 md:h-4"></span>
        </div>

        {/* Grid */}
        <div className="flex gap-[3px] overflow-x-auto pb-2">
          {gridData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-sm ${getColor(day.level)}
                    ${!day.isFuture && 'hover:ring-2 hover:ring-white/50 cursor-pointer'}
                    transition-all group relative`}
                  title={day.isFuture ? '' : `${formatDate(day.date)}: ${day.count} proof${day.count !== 1 ? 's' : ''}`}
                >
                  {/* Tooltip */}
                  {!day.isFuture && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                      bg-night-800 border border-white/10 rounded text-xs whitespace-nowrap
                      opacity-0 group-hover:opacity-100 transition pointer-events-none z-20 shadow-lg">
                      <div className="font-medium">{day.count} proof{day.count !== 1 ? 's' : ''}</div>
                      <div className="text-zinc-400">{formatDate(day.date)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
