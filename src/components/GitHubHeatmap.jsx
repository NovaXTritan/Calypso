import React, { useMemo, useState, useCallback, memo } from 'react'
import { Flame, Calendar, TrendingUp, Zap } from 'lucide-react'

// ============================================
// PURE UTILITY FUNCTIONS (outside component to prevent recreation)
// ============================================

// Format date to YYYY-MM-DD in local timezone
function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Format date for display
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

// Format short date
function formatShortDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

// Color classes based on activity level
const LEVEL_COLORS = {
  [-1]: 'bg-zinc-800/20', // Future
  0: 'bg-zinc-700/40',
  1: 'bg-emerald-900/70',
  2: 'bg-emerald-700/80',
  3: 'bg-emerald-500/90',
  4: 'bg-emerald-400'
}

function getColorClass(level) {
  return LEVEL_COLORS[level] || LEVEL_COLORS[0]
}

// Day names (showing only Mon, Wed, Fri like GitHub)
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

// ============================================
// MEMOIZED CELL COMPONENT
// ============================================

const HeatmapCell = memo(function HeatmapCell({
  day,
  onMouseEnter,
  onMouseLeave,
  onClick
}) {
  const handleMouseEnter = useCallback((e) => {
    if (!day.isFuture) onMouseEnter(e, day)
  }, [day, onMouseEnter])

  const handleClick = useCallback(() => {
    if (!day.isFuture) onClick(day)
  }, [day, onClick])

  return (
    <div
      className={`
        w-[11px] h-[11px] rounded-sm transition-all duration-150
        ${getColorClass(day.level)}
        ${day.isToday ? 'ring-1 ring-white/50' : ''}
        ${!day.isFuture ? 'hover:ring-2 hover:ring-white/70 cursor-pointer' : 'cursor-default'}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
      role="gridcell"
      aria-label={day.isFuture ? 'Future date' : `${formatShortDate(day.date)}: ${day.count} proof${day.count !== 1 ? 's' : ''}`}
      tabIndex={day.isFuture ? -1 : 0}
    />
  )
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these changed
  return (
    prevProps.day.dateKey === nextProps.day.dateKey &&
    prevProps.day.count === nextProps.day.count &&
    prevProps.day.level === nextProps.day.level &&
    prevProps.day.isToday === nextProps.day.isToday
  )
})

// ============================================
// MAIN COMPONENT
// ============================================

function GitHubHeatmap({ activityData = [], currentStreak: propStreak, longestStreak: propLongestStreak }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Process all data in a single memoized computation
  const computedData = useMemo(() => {
    // === Step 1: Build activity map ===
    const activityMap = new Map()

    activityData.forEach(item => {
      let date
      if (item.date?.toDate) {
        date = item.date.toDate()
      } else if (item.date instanceof Date) {
        date = item.date
      } else if (typeof item.date === 'number') {
        date = new Date(item.date)
      } else {
        date = new Date(item.date)
      }

      if (isNaN(date.getTime())) return

      const dateKey = formatDateKey(date)
      activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + (item.count || 1))
    })

    // === Step 2: Calculate stats ===
    let totalActivity = 0
    let activeDays = 0
    let maxInDay = 0

    activityMap.forEach(count => {
      totalActivity += count
      activeDays++
      if (count > maxInDay) maxInDay = count
    })

    // Activity level function using maxInDay
    const getActivityLevel = (count) => {
      if (count === 0) return 0
      if (maxInDay <= 1) return count >= 1 ? 2 : 0
      const ratio = count / maxInDay
      if (ratio <= 0.25) return 1
      if (ratio <= 0.5) return 2
      if (ratio <= 0.75) return 3
      return 4
    }

    // === Step 3: Generate grid data ===
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const todayKey = formatDateKey(today)

    const grid = []
    const months = []
    let lastMonth = -1

    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364)
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)
    startDate.setHours(0, 0, 0, 0)

    const totalDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) + 1
    const totalWeeks = Math.ceil(totalDays / 7)

    for (let week = 0; week < totalWeeks; week++) {
      const weekData = []

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + (week * 7) + day)

        const dateKey = formatDateKey(currentDate)
        const count = activityMap.get(dateKey) || 0
        const isFuture = currentDate > today
        const isToday = dateKey === todayKey

        weekData.push({
          date: currentDate,
          dateKey,
          count,
          isFuture,
          isToday,
          level: isFuture ? -1 : getActivityLevel(count)
        })

        if (day === 0) {
          const month = currentDate.getMonth()
          if (month !== lastMonth && !isFuture) {
            months.push({
              month: currentDate.toLocaleDateString('en-US', { month: 'short' }),
              weekIndex: week
            })
            lastMonth = month
          }
        }
      }

      grid.push(weekData)
    }

    // === Step 4: Calculate streaks ===
    let currentStreak = 0
    let longestStreak = 0

    // Calculate current streak (count backwards from today)
    const todayActivity = activityMap.get(todayKey) || 0
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = formatDateKey(yesterday)

    if (todayActivity > 0) {
      currentStreak = 1
      for (let i = 1; i <= 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const checkKey = formatDateKey(checkDate)
        if (activityMap.get(checkKey) > 0) {
          currentStreak++
        } else {
          break
        }
      }
    } else if (activityMap.get(yesterdayKey) > 0) {
      currentStreak = 1
      for (let i = 2; i <= 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const checkKey = formatDateKey(checkDate)
        if (activityMap.get(checkKey) > 0) {
          currentStreak++
        } else {
          break
        }
      }
    }

    // Calculate longest streak
    const allDays = grid.flat().filter(d => !d.isFuture).sort((a, b) => a.date - b.date)
    let tempStreak = 0
    let lastActiveDate = null

    allDays.forEach(day => {
      if (day.count > 0) {
        if (lastActiveDate === null) {
          tempStreak = 1
        } else {
          const dayDiff = Math.round((day.date - lastActiveDate) / (1000 * 60 * 60 * 24))
          tempStreak = dayDiff === 1 ? tempStreak + 1 : 1
        }
        lastActiveDate = day.date
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    })

    // Weekly calculations
    const last12Weeks = grid.slice(-12)
    let weeklyTotal = 0
    last12Weeks.forEach(week => {
      week.forEach(day => {
        if (!day.isFuture) weeklyTotal += day.count
      })
    })
    const weeklyAvg = (weeklyTotal / 12).toFixed(1)

    const currentWeek = grid[grid.length - 1] || []
    const thisWeekCount = currentWeek.reduce((sum, day) => sum + (day.isFuture ? 0 : day.count), 0)

    // Use prop values if they're higher
    const finalCurrentStreak = Math.max(currentStreak, propStreak || 0)
    const finalLongestStreak = Math.max(longestStreak, propLongestStreak || 0, finalCurrentStreak)

    return {
      activityMap,
      stats: { totalActivity, activeDays, maxInDay },
      gridData: grid,
      monthLabels: months,
      currentStreak: finalCurrentStreak,
      longestStreak: finalLongestStreak,
      weeklyAvg,
      thisWeekCount
    }
  }, [activityData, propStreak, propLongestStreak])

  // Destructure computed data
  const {
    stats,
    gridData,
    monthLabels,
    currentStreak,
    longestStreak,
    weeklyAvg,
    thisWeekCount
  } = computedData

  // Event handlers
  const handleCellHover = useCallback((e, day) => {
    const rect = e.target.getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setSelectedDay(day)
  }, [])

  const handleCellLeave = useCallback(() => {
    setSelectedDay(null)
  }, [])

  const handleCellClick = useCallback((day) => {
    setSelectedDay(prev =>
      prev?.dateKey === day.dateKey ? null : day
    )
  }, [])

  return (
    <div className="glass p-5 rounded-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="text-emerald-400" size={20} />
            Activity Heatmap
          </h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            {stats.totalActivity} proof{stats.totalActivity !== 1 ? 's' : ''} in the last year
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getColorClass(level)}`}
                title={level === 0 ? 'No activity' : `Level ${level}`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-glow-400">
            <Flame size={18} />
            {currentStreak}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Current Streak</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-emerald-400">
            <TrendingUp size={18} />
            {longestStreak}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Longest Streak</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xl font-bold text-brand-400">
            <Zap size={18} />
            {thisWeekCount}
          </div>
          <div className="text-xs text-zinc-500 mt-1">This Week</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-purple-400">{stats.activeDays}</div>
          <div className="text-xs text-zinc-500 mt-1">Active Days</div>
        </div>
      </div>

      {/* Heatmap Container */}
      <div className="relative overflow-x-auto pb-2">
        {/* Month Labels */}
        <div className="flex mb-2" style={{ marginLeft: '32px' }}>
          {monthLabels.map((label, i) => {
            const nextLabel = monthLabels[i + 1]
            const width = nextLabel
              ? (nextLabel.weekIndex - label.weekIndex) * 13
              : (gridData.length - label.weekIndex) * 13

            return (
              <div
                key={`${label.month}-${label.weekIndex}`}
                className="text-xs text-zinc-500 flex-shrink-0"
                style={{ width: `${Math.max(width, 26)}px` }}
              >
                {label.month}
              </div>
            )
          })}
        </div>

        {/* Grid with Day Labels */}
        <div className="flex">
          {/* Day Labels Column */}
          <div className="flex flex-col gap-[3px] pr-2 flex-shrink-0" style={{ width: '32px' }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="h-[11px] text-[10px] text-zinc-500 flex items-center justify-end pr-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap Grid */}
          <div className="flex gap-[3px]">
            {gridData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <HeatmapCell
                    key={day.dateKey}
                    day={day}
                    onMouseEnter={handleCellHover}
                    onMouseLeave={handleCellLeave}
                    onClick={handleCellClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {selectedDay && !selectedDay.isFuture && (
        <div
          className="fixed z-50 px-3 py-2 bg-night-900 border border-white/20 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 8
          }}
        >
          <div className="text-sm font-medium text-white">
            {selectedDay.count} proof{selectedDay.count !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-zinc-400">
            {formatDate(selectedDay.date)}
          </div>
          {selectedDay.isToday && (
            <div className="text-xs text-emerald-400 mt-1">Today</div>
          )}
        </div>
      )}

      {/* Weekly Summary */}
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <div>
          Avg: <span className="text-zinc-300">{weeklyAvg}</span> proofs/week
        </div>
        <div>
          {currentStreak > 0 ? (
            <span className="text-glow-400">
              <Flame size={12} className="inline mr-1" />
              {currentStreak} day streak! Keep it up!
            </span>
          ) : (
            <span>Post a proof today to start your streak!</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(GitHubHeatmap)
