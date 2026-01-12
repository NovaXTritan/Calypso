/**
 * Centralized date utilities for consistent timezone handling across the app
 * All calculations use LOCAL timezone for user-facing features
 */

/**
 * Get the start of a day in local timezone
 * @param {Date|number|{toDate: Function}} date - Date, timestamp, or Firebase Timestamp
 * @returns {Date} Start of day (00:00:00.000)
 */
export function startOfDay(date) {
  const d = normalizeDate(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the end of a day in local timezone
 * @param {Date|number|{toDate: Function}} date - Date, timestamp, or Firebase Timestamp
 * @returns {Date} End of day (23:59:59.999)
 */
export function endOfDay(date) {
  const d = normalizeDate(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Normalize any date input to a Date object
 * Handles Firebase Timestamps, Date objects, and timestamps
 * @param {Date|number|{toDate: Function}|string} date
 * @returns {Date}
 */
export function normalizeDate(date) {
  if (!date) return new Date()
  if (date.toDate && typeof date.toDate === 'function') {
    return new Date(date.toDate())
  }
  if (date instanceof Date) {
    return new Date(date)
  }
  if (typeof date === 'number' || typeof date === 'string') {
    return new Date(date)
  }
  return new Date()
}

/**
 * Get a date key in YYYY-MM-DD format using LOCAL timezone
 * Use this for all date comparisons and map keys
 * @param {Date|number|{toDate: Function}} date
 * @returns {string} Date key like "2025-01-12"
 */
export function getDateKey(date) {
  const d = normalizeDate(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the difference in calendar days between two dates
 * Uses local timezone, accounts for DST
 * @param {Date|number} date1
 * @param {Date|number} date2
 * @returns {number} Number of calendar days difference (positive if date1 > date2)
 */
export function getDaysDifference(date1, date2) {
  const d1 = startOfDay(date1)
  const d2 = startOfDay(date2)
  // Use Math.round to handle DST edge cases (23 or 25 hour days)
  return Math.round((d1 - d2) / (1000 * 60 * 60 * 24))
}

/**
 * Check if two dates are on the same calendar day (local timezone)
 * @param {Date|number|{toDate: Function}} date1
 * @param {Date|number|{toDate: Function}} date2
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
  return getDateKey(date1) === getDateKey(date2)
}

/**
 * Check if a date is today (local timezone)
 * @param {Date|number|{toDate: Function}} date
 * @returns {boolean}
 */
export function isToday(date) {
  return isSameDay(date, new Date())
}

/**
 * Check if a date is yesterday (local timezone)
 * @param {Date|number|{toDate: Function}} date
 * @returns {boolean}
 */
export function isYesterday(date) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(date, yesterday)
}

/**
 * Get date N days ago
 * @param {number} days
 * @returns {Date}
 */
export function daysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

/**
 * Get the start of the week (Sunday) for a given date
 * @param {Date|number} date
 * @returns {Date}
 */
export function startOfWeek(date) {
  const d = normalizeDate(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return startOfDay(d)
}

/**
 * Get week number of the year
 * @param {Date|number} date
 * @returns {number}
 */
export function getWeekNumber(date) {
  const d = normalizeDate(date)
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d - startOfYear) / (1000 * 60 * 60 * 24))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

/**
 * Calculate streak from an array of activity items
 * Each item should have a date property (timestamp, Date, or Firebase Timestamp)
 * @param {Array<{date: any}>} activities - Array of activities with dates
 * @param {boolean} includeToday - Whether to require activity today for current streak
 * @returns {{current: number, longest: number, lastActiveDate: Date|null}}
 */
export function calculateStreaks(activities) {
  if (!activities || activities.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null }
  }

  // Create a Set of unique date keys with activity
  const activeDates = new Set()
  activities.forEach(item => {
    const dateKey = getDateKey(item.date || item.createdAt)
    activeDates.add(dateKey)
  })

  // Sort dates chronologically
  const sortedDates = Array.from(activeDates).sort()

  // Calculate longest streak
  let longest = 0
  let tempStreak = 0
  let prevDateKey = null

  for (const dateKey of sortedDates) {
    if (prevDateKey === null) {
      tempStreak = 1
    } else {
      const prevDate = new Date(prevDateKey)
      const currDate = new Date(dateKey)
      const daysDiff = getDaysDifference(currDate, prevDate)

      if (daysDiff === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    longest = Math.max(longest, tempStreak)
    prevDateKey = dateKey
  }

  // Calculate current streak (counting backwards from today)
  const today = new Date()
  const todayKey = getDateKey(today)
  const yesterdayKey = getDateKey(daysAgo(1))

  let current = 0
  let checkDate = today

  // First check if today or yesterday has activity
  if (activeDates.has(todayKey)) {
    current = 1
    checkDate = daysAgo(1)
  } else if (activeDates.has(yesterdayKey)) {
    // Streak is still valid if yesterday had activity (user has until end of today)
    current = 1
    checkDate = daysAgo(2)
  } else {
    // No activity today or yesterday - streak is 0
    return {
      current: 0,
      longest,
      lastActiveDate: sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1]) : null
    }
  }

  // Count backwards
  for (let i = 0; i < 365; i++) {
    const checkKey = getDateKey(checkDate)
    if (activeDates.has(checkKey)) {
      current++
      checkDate = new Date(checkDate)
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    current,
    longest: Math.max(longest, current),
    lastActiveDate: sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1]) : null
  }
}

/**
 * Get hours and minutes until midnight (for streak reminders)
 * Accounts for DST transitions
 * @returns {{hours: number, minutes: number, totalMinutes: number}}
 */
export function getTimeUntilMidnight() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)

  const diffMs = midnight - now
  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return { hours, minutes, totalMinutes }
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * @param {Date|number|{toDate: Function}} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const d = normalizeDate(date)
  const now = new Date()
  const diffMs = now - d

  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = getDaysDifference(now, d)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

/**
 * Format a date for display
 * @param {Date|number|{toDate: Function}} date
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  const d = normalizeDate(date)
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }
  return d.toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

/**
 * Get week boundaries (start and end timestamps)
 * @param {number} weeksAgo - Number of weeks ago (0 = this week)
 * @returns {{start: number, end: number}}
 */
export function getWeekBoundaries(weeksAgo = 0) {
  const now = new Date()
  const startOfThisWeek = startOfWeek(now)

  const start = new Date(startOfThisWeek)
  start.setDate(start.getDate() - (weeksAgo * 7))

  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  end.setMilliseconds(-1) // End of Saturday

  return {
    start: start.getTime(),
    end: end.getTime()
  }
}

/**
 * Group activities by date
 * @param {Array<{date: any}>} activities
 * @returns {Map<string, Array>} Map of dateKey -> activities
 */
export function groupByDate(activities) {
  const groups = new Map()

  activities.forEach(activity => {
    const dateKey = getDateKey(activity.date || activity.createdAt)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey).push(activity)
  })

  return groups
}

/**
 * Generate array of dates for a range
 * @param {Date|number} startDate
 * @param {Date|number} endDate
 * @returns {Date[]}
 */
export function getDateRange(startDate, endDate) {
  const dates = []
  const current = startOfDay(startDate)
  const end = startOfDay(endDate)

  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Calculate average value per time period
 * @param {number} total - Total count
 * @param {Date|number} startDate - When counting began
 * @param {'day'|'week'|'month'} period - Time period
 * @returns {number} Average per period (1 decimal place)
 */
export function calculateAverage(total, startDate, period = 'week') {
  const start = normalizeDate(startDate)
  const now = new Date()
  const daysDiff = Math.max(1, getDaysDifference(now, start))

  let divisor
  switch (period) {
    case 'day':
      divisor = daysDiff
      break
    case 'week':
      divisor = Math.max(1, daysDiff / 7)
      break
    case 'month':
      divisor = Math.max(1, daysDiff / 30)
      break
    default:
      divisor = Math.max(1, daysDiff / 7)
  }

  return Math.round((total / divisor) * 10) / 10
}
