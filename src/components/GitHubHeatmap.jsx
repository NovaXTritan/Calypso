import React, { useMemo, useState } from 'react'
import { Flame, Calendar, TrendingUp, Zap } from 'lucide-react'

/**
 * GitHub-style contribution heatmap showing activity over the past year
 * Accurate date handling, proper streak calculation, and responsive design
 */
export default function GitHubHeatmap({ activityData = [], currentStreak: propStreak, longestStreak: propLongestStreak }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Process activity data into a date -> count map
  const activityMap = useMemo(() => {
    const map = new Map()

    activityData.forEach(item => {
      // Handle Firebase Timestamp, Date object, or timestamp number
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

      if (isNaN(date.getTime())) return // Skip invalid dates

      // Create date key in local timezone (YYYY-MM-DD)
      const dateKey = formatDateKey(date)
      map.set(dateKey, (map.get(dateKey) || 0) + (item.count || 1))
    })

    return map
  }, [activityData])

  // Format date to YYYY-MM-DD in local timezone
  function formatDateKey(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Calculate stats from actual data - MUST be before gridData since getActivityLevel uses maxInDay
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

  // Activity level (0-4) based on relative activity - uses stats.maxInDay
  function getActivityLevel(count) {
    if (count === 0) return 0
    if (stats.maxInDay <= 1) {
      return count >= 1 ? 2 : 0
    }
    const ratio = count / stats.maxInDay
    if (ratio <= 0.25) return 1
    if (ratio <= 0.5) return 2
    if (ratio <= 0.75) return 3
    return 4
  }

  // Generate grid data for the past 53 weeks (GitHub shows ~1 year)
  const { gridData, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today

    const grid = []
    const months = []
    let lastMonth = -1

    // Calculate start date: go back ~1 year to the nearest Sunday
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 364) // Go back ~52 weeks
    // Adjust to the previous Sunday (day 0)
    const dayOfWeek = startDate.getDay()
    startDate.setDate(startDate.getDate() - dayOfWeek)
    startDate.setHours(0, 0, 0, 0)

    // Calculate total days from start to today
    const totalDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)) + 1
    const totalWeeks = Math.ceil(totalDays / 7)

    // Generate grid: each column is a week, each row is a day (Sun=0 to Sat=6)
    for (let week = 0; week < totalWeeks; week++) {
      const weekData = []

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + (week * 7) + day)

        const dateKey = formatDateKey(currentDate)
        const count = activityMap.get(dateKey) || 0
        const isFuture = currentDate > today
        const isToday = dateKey === formatDateKey(today)

        weekData.push({
          date: currentDate,
          dateKey,
          count,
          isFuture,
          isToday,
          level: isFuture ? -1 : getActivityLevel(count)
        })

        // Track month labels (first day of each month that appears)
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

    return { gridData: grid, monthLabels: months }
  }, [activityMap, stats])

  // Calculate streaks from grid data (more accurate than props)
  const { currentStreak, longestStreak, weeklyAvg, thisWeekCount } = useMemo(() => {
    const today = new Date()
    const todayKey = formatDateKey(today)

    // Flatten grid into chronological order
    const allDays = gridData.flat().filter(d => !d.isFuture)

    // Sort by date ascending
    allDays.sort((a, b) => a.date - b.date)

    let current = 0
    let longest = 0
    let tempStreak = 0
    let lastActiveDate = null

    // Calculate streaks
    allDays.forEach(day => {
      if (day.count > 0) {
        if (lastActiveDate === null) {
          tempStreak = 1
        } else {
          const dayDiff = Math.round((day.date - lastActiveDate) / (1000 * 60 * 60 * 24))
          if (dayDiff === 1) {
            tempStreak++
          } else {
            tempStreak = 1
          }
        }
        lastActiveDate = day.date
        longest = Math.max(longest, tempStreak)
      } else {
        tempStreak = 0
      }
    })

    // Current streak: count backwards from today
    current = 0
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Check if today has activity
    const todayActivity = activityMap.get(todayKey) || 0

    if (todayActivity > 0) {
      current = 1
      // Count backwards
      for (let i = 1; i <= 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const checkKey = formatDateKey(checkDate)
        if (activityMap.get(checkKey) > 0) {
          current++
        } else {
          break
        }
      }
    } else {
      // Check if yesterday had activity (streak might still be active)
      const yesterdayKey = formatDateKey(yesterday)
      if (activityMap.get(yesterdayKey) > 0) {
        current = 1
        for (let i = 2; i <= 365; i++) {
          const checkDate = new Date(today)
          checkDate.setDate(checkDate.getDate() - i)
          const checkKey = formatDateKey(checkDate)
          if (activityMap.get(checkKey) > 0) {
            current++
          } else {
            break
          }
        }
      }
    }

    // Weekly average (last 12 weeks)
    const last12Weeks = gridData.slice(-12)
    let weeklyTotal = 0
    last12Weeks.forEach(week => {
      week.forEach(day => {
        if (!day.isFuture) weeklyTotal += day.count
      })
    })
    const weeklyAvg = (weeklyTotal / 12).toFixed(1)

    // This week count
    const currentWeek = gridData[gridData.length - 1] || []
    const thisWeekCount = currentWeek.reduce((sum, day) => sum + (day.isFuture ? 0 : day.count), 0)

    // Use prop values if they're higher (from database)
    const finalCurrent = Math.max(current, propStreak || 0)
    const finalLongest = Math.max(longest, propLongestStreak || 0, finalCurrent)

    return {
      currentStreak: finalCurrent,
      longestStreak: finalLongest,
      weeklyAvg,
      thisWeekCount
    }
  }, [gridData, activityMap, propStreak, propLongestStreak])

  // Color classes based on activity level
  function getColorClass(level, isToday = false) {
    const colors = {
      [-1]: 'bg-zinc-800/20', // Future
      0: 'bg-zinc-700/40',
      1: 'bg-emerald-900/70',
      2: 'bg-emerald-700/80',
      3: 'bg-emerald-500/90',
      4: 'bg-emerald-400'
    }
    return colors[level] || colors[0]
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

  // Day names (showing only Mon, Wed, Fri like GitHub)
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  // Handle cell hover
  function handleCellHover(e, day) {
    if (day.isFuture) return
    const rect = e.target.getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setSelectedDay(day)
  }

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
            // Calculate position based on week index
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
            {dayLabels.map((label, i) => (
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
                {week.map((day, dayIndex) => (
                  <div
                    key={day.dateKey}
                    className={`
                      w-[11px] h-[11px] rounded-sm transition-all duration-150
                      ${getColorClass(day.level, day.isToday)}
                      ${day.isToday ? 'ring-1 ring-white/50' : ''}
                      ${!day.isFuture ? 'hover:ring-2 hover:ring-white/70 cursor-pointer' : 'cursor-default'}
                    `}
                    onMouseEnter={(e) => handleCellHover(e, day)}
                    onMouseLeave={() => setSelectedDay(null)}
                    onClick={() => !day.isFuture && setSelectedDay(selectedDay?.dateKey === day.dateKey ? null : day)}
                    role="gridcell"
                    aria-label={day.isFuture ? 'Future date' : `${formatShortDate(day.date)}: ${day.count} proof${day.count !== 1 ? 's' : ''}`}
                    tabIndex={day.isFuture ? -1 : 0}
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
