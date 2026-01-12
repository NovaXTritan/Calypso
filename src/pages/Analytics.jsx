import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'
import { Flame, Target, Users, TrendingUp, Award, ArrowUp, ArrowDown, Minus, BarChart3, Zap, Calendar, Clock, Sparkles, ChevronRight, Trophy, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import { getUserAchievements, getAchievementProgress, ACHIEVEMENTS } from '../lib/achievements'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import { getDateKey, calculateStreaks, getWeekBoundaries, normalizeDate, getDaysDifference, calculateAverage, daysAgo } from '../utils/dateUtils'

export default function Analytics() {
  const { currentUser } = useAuth()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProofs: 0,
    currentStreak: 0,
    podsJoined: 0,
    thisWeek: 0,
    lastWeek: 0,
    bestStreak: 0,
    avgProofsPerWeek: 0,
    mostActiveDay: '',
    mostActivePod: ''
  })
  const [activityData, setActivityData] = useState([])
  const [weeklyData, setWeeklyData] = useState([])
  const [podActivity, setPodActivity] = useState([])
  const [communityStats, setCommunityStats] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [achievementProgress, setAchievementProgress] = useState({})
  const [insights, setInsights] = useState([])

  // Colors for pie chart
  const COLORS = ['#667dff', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4']

  useEffect(() => {
    if (currentUser) {
      fetchAnalytics()
    }
  }, [currentUser])

  async function fetchAnalytics() {
    try {
      setLoading(true)

      // Fetch posts by current user
      const postsQuery = query(
        collection(db, 'posts'),
        where('author', '==', currentUser.uid)
      )
      const postsSnapshot = await getDocs(postsQuery)
      const posts = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Calculate total proofs
      const totalProofs = posts.length

      // Calculate activity by date using local timezone (via dateUtils)
      const activityByDate = {}
      const activityByDay = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
      const activityByPod = {}

      posts.forEach(post => {
        const date = normalizeDate(post.createdAt)
        const dateStr = getDateKey(date) // Uses local timezone consistently
        activityByDate[dateStr] = (activityByDate[dateStr] || 0) + 1
        activityByDay[date.getDay()] = (activityByDay[date.getDay()] || 0) + 1

        if (post.pod) {
          activityByPod[post.pod] = (activityByPod[post.pod] || 0) + 1
        }
      })

      // Calculate streaks using centralized utility (handles all edge cases)
      const streakData = calculateStreaks(posts.map(p => ({ date: p.createdAt })))
      const streak = streakData.current
      const bestStreak = streakData.longest

      // Calculate this week and last week using proper week boundaries
      const thisWeekBounds = getWeekBoundaries(0)
      const lastWeekBounds = getWeekBoundaries(1)
      const thisWeek = posts.filter(p => {
        const ts = normalizeDate(p.createdAt).getTime()
        return ts >= thisWeekBounds.start && ts <= thisWeekBounds.end
      }).length
      const lastWeek = posts.filter(p => {
        const ts = normalizeDate(p.createdAt).getTime()
        return ts >= lastWeekBounds.start && ts <= lastWeekBounds.end
      }).length

      // Most active day
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const mostActiveDayNum = Object.entries(activityByDay).sort((a, b) => b[1] - a[1])[0]
      const mostActiveDay = mostActiveDayNum && mostActiveDayNum[1] > 0
        ? dayNames[parseInt(mostActiveDayNum[0])]
        : 'N/A'

      // Most active pod
      const podEntries = Object.entries(activityByPod).sort((a, b) => b[1] - a[1])
      const mostActivePod = podEntries.length > 0 ? podEntries[0][0] : 'None'

      // Average proofs per week using proper calculation
      const firstPostDate = posts.length > 0
        ? Math.min(...posts.map(p => normalizeDate(p.createdAt).getTime()))
        : Date.now()
      const avgProofsPerWeek = calculateAverage(totalProofs, firstPostDate, 'week')

      // Get pods joined
      const podsJoined = currentUser.joinedPods?.length || 0

      // Prepare heatmap data (last 365 days) using local timezone
      const heatmapData = []
      for (let i = 364; i >= 0; i--) {
        const date = daysAgo(i)
        const dateStr = getDateKey(date) // Local timezone
        heatmapData.push({
          date: dateStr,
          count: activityByDate[dateStr] || 0
        })
      }

      // Prepare weekly chart data (last 8 weeks) using proper boundaries
      const weeklyActivity = []
      for (let i = 7; i >= 0; i--) {
        const weekBounds = getWeekBoundaries(i)
        const weekPosts = posts.filter(p => {
          const ts = normalizeDate(p.createdAt).getTime()
          return ts >= weekBounds.start && ts <= weekBounds.end
        })

        weeklyActivity.push({
          week: `W${8 - i}`,
          proofs: weekPosts.length
        })
      }

      // Prepare pod activity data for pie chart
      const podActivityData = podEntries.slice(0, 6).map(([name, value]) => ({ name, value }))

      // Fetch community stats for comparison
      try {
        const allUsersQuery = query(collection(db, 'users'), limit(100))
        const usersSnapshot = await getDocs(allUsersQuery)
        const users = usersSnapshot.docs.map(doc => doc.data())

        const avgStreak = Math.round(users.reduce((sum, u) => sum + (u.streak || 0), 0) / users.length)
        const avgProofs = Math.round(users.reduce((sum, u) => sum + (u.totalProofs || 0), 0) / users.length)

        setCommunityStats({ avgStreak, avgProofs, totalUsers: users.length })
      } catch (e) {
        console.error('Error fetching community stats:', e)
      }

      // Load achievements
      const userAchievementIds = currentUser.achievements || []
      setAchievements(getUserAchievements(userAchievementIds))
      setAchievementProgress(getAchievementProgress({
        streak,
        totalProofs,
        podsJoined
      }))

      // Generate insights
      const newInsights = []
      if (thisWeek > lastWeek && lastWeek > 0) {
        newInsights.push({ type: 'positive', text: `You posted ${Math.round((thisWeek - lastWeek) / lastWeek * 100)}% more proofs this week!`, icon: TrendingUp })
      } else if (thisWeek < lastWeek && thisWeek > 0) {
        newInsights.push({ type: 'warning', text: `Activity is down ${Math.round((lastWeek - thisWeek) / lastWeek * 100)}% from last week`, icon: TrendingUp })
      }
      if (streak >= 7) {
        newInsights.push({ type: 'positive', text: `Amazing! You've maintained a ${streak}-day streak!`, icon: Flame })
      }
      if (mostActiveDay) {
        newInsights.push({ type: 'neutral', text: `${mostActiveDay} is your most productive day`, icon: Calendar })
      }
      if (bestStreak > streak && bestStreak > 3) {
        newInsights.push({ type: 'challenge', text: `Your best streak was ${bestStreak} days. Can you beat it?`, icon: Trophy })
      }
      setInsights(newInsights)

      setStats({
        totalProofs,
        currentStreak: streak,
        podsJoined,
        thisWeek,
        lastWeek,
        bestStreak,
        avgProofsPerWeek,
        mostActiveDay,
        mostActivePod
      })
      setActivityData(heatmapData)
      setWeeklyData(weeklyActivity)
      setPodActivity(podActivityData)
    } catch (error) {
      trackError(error, { action: 'fetchAnalytics', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
    } finally {
      setLoading(false)
    }
  }

  // Calculate week-over-week change
  const weekChange = useMemo(() => {
    if (stats.lastWeek === 0) return { direction: 'neutral', percent: 0 }
    const change = ((stats.thisWeek - stats.lastWeek) / stats.lastWeek) * 100
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percent: Math.abs(Math.round(change))
    }
  }, [stats.thisWeek, stats.lastWeek])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Crunching your numbers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-brand-400" />
            Your Analytics
          </h1>
          <p className="text-zinc-400 mt-1">Track your learning journey</p>
        </div>
      </div>

      {/* Insights Banner */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="glass p-4 rounded-2xl border border-brand-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-zinc-400">INSIGHTS</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    insight.type === 'positive' ? 'bg-green-500/10 border border-green-500/20' :
                    insight.type === 'warning' ? 'bg-orange-500/10 border border-orange-500/20' :
                    insight.type === 'challenge' ? 'bg-purple-500/10 border border-purple-500/20' :
                    'bg-white/5 border border-white/10'
                  }`}
                >
                  <insight.icon className={`w-5 h-5 flex-shrink-0 ${
                    insight.type === 'positive' ? 'text-green-400' :
                    insight.type === 'warning' ? 'text-orange-400' :
                    insight.type === 'challenge' ? 'text-purple-400' :
                    'text-zinc-400'
                  }`} />
                  <span className="text-sm text-zinc-300">{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-5 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-medium">Total Proofs</span>
            <Target className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalProofs}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass p-5 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-medium">Current Streak</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.currentStreak}</div>
          <div className="text-xs text-zinc-500">days</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-5 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-medium">Best Streak</span>
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.bestStreak}</div>
          <div className="text-xs text-zinc-500">days</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass p-5 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-medium">This Week</span>
            {weekChange.direction === 'up' && <ArrowUp className="w-4 h-4 text-green-400" />}
            {weekChange.direction === 'down' && <ArrowDown className="w-4 h-4 text-red-400" />}
            {weekChange.direction === 'neutral' && <Minus className="w-4 h-4 text-zinc-400" />}
          </div>
          <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
          {weekChange.percent > 0 && (
            <div className={`text-xs ${weekChange.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {weekChange.direction === 'up' ? '+' : '-'}{weekChange.percent}% vs last week
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-5 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-medium">Pods Joined</span>
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.podsJoined}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass p-5 rounded-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-xs font-medium">Avg/Week</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.avgProofsPerWeek}</div>
          <div className="text-xs text-zinc-500">proofs</div>
        </motion.div>
      </div>

      {/* Community Comparison */}
      {communityStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-5 rounded-xl mb-8"
        >
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            HOW YOU COMPARE
          </h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-300">Your Streak</span>
                <span className="text-sm text-zinc-300">Community Avg</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                    style={{ width: `${Math.min(100, (stats.currentStreak / Math.max(stats.currentStreak, communityStats.avgStreak)) * 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-white w-12 text-right">{stats.currentStreak}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-600 rounded-full"
                    style={{ width: `${Math.min(100, (communityStats.avgStreak / Math.max(stats.currentStreak, communityStats.avgStreak)) * 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-zinc-400 w-12 text-right">{communityStats.avgStreak}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-300">Your Proofs</span>
                <span className="text-sm text-zinc-300">Community Avg</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full"
                    style={{ width: `${Math.min(100, (stats.totalProofs / Math.max(stats.totalProofs, communityStats.avgProofs)) * 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-white w-12 text-right">{stats.totalProofs}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-600 rounded-full"
                    style={{ width: `${Math.min(100, (communityStats.avgProofs / Math.max(stats.totalProofs, communityStats.avgProofs)) * 100)}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-zinc-400 w-12 text-right">{communityStats.avgProofs}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Pod Activity Pie Chart */}
        {podActivity.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass p-6 rounded-xl"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Activity by Pod</h2>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={podActivity}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {podActivity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {podActivity.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-zinc-300 truncate flex-1">{entry.name}</span>
                    <span className="text-sm text-zinc-400">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass p-6 rounded-xl"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Your Patterns</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Most Active Day</div>
                  <div className="text-xs text-zinc-400">When you post the most</div>
                </div>
              </div>
              <div className="text-lg font-bold text-purple-400">{stats.mostActiveDay}</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Favorite Pod</div>
                  <div className="text-xs text-zinc-400">Where you're most active</div>
                </div>
              </div>
              <div className="text-sm font-bold text-brand-400 truncate max-w-[120px]">{stats.mostActivePod}</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Achievements</div>
                  <div className="text-xs text-zinc-400">Badges earned</div>
                </div>
              </div>
              <Link to="/profile" className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300">
                {achievements.length} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Activity Heatmap */}
      <div className="glass-card p-6 rounded-xl mb-12">
        <h2 className="text-xl font-semibold text-white mb-6">Activity Heatmap</h2>
        <div className="overflow-x-auto">
          <CalendarHeatmap
            startDate={new Date(new Date().setDate(new Date().getDate() - 364))}
            endDate={new Date()}
            values={activityData}
            classForValue={(value) => {
              if (!value || value.count === 0) {
                return 'color-empty'
              }
              return `color-scale-${Math.min(value.count, 4)}`
            }}
            tooltipDataAttrs={(value) => {
              return {
                'data-tip': `${value.date}: ${value.count || 0} proofs`
              }
            }}
            showWeekdayLabels={true}
          />
        </div>
        <style>{`
          .react-calendar-heatmap .color-empty { fill: rgba(255,255,255,0.05); }
          .react-calendar-heatmap .color-scale-1 { fill: rgba(102,125,255,0.3); }
          .react-calendar-heatmap .color-scale-2 { fill: rgba(102,125,255,0.5); }
          .react-calendar-heatmap .color-scale-3 { fill: rgba(102,125,255,0.7); }
          .react-calendar-heatmap .color-scale-4 { fill: rgba(102,125,255,0.9); }
          .react-calendar-heatmap text { fill: rgba(255,255,255,0.5); font-size: 10px; }
        `}</style>
      </div>

      {/* Weekly Activity Chart */}
      <div className="glass-card p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-white mb-6">Weekly Activity</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyData}>
            <XAxis 
              dataKey="week" 
              stroke="rgba(255,255,255,0.3)"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar 
              dataKey="proofs" 
              fill="url(#colorGradient)"
              radius={[8, 8, 0, 0]}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#667dff" stopOpacity={0.8}/>
                <stop offset="100%" stopColor="#667dff" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
