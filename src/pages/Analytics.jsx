import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'
import { Flame, Target, Users, TrendingUp } from 'lucide-react'
import { trackError, ErrorCategory } from '../utils/errorTracking'

export default function Analytics() {
  const { currentUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProofs: 0,
    currentStreak: 0,
    podsJoined: 0,
    thisWeek: 0
  })
  const [activityData, setActivityData] = useState([])
  const [weeklyData, setWeeklyData] = useState([])

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

      // Calculate activity by date
      const activityByDate = {}
      posts.forEach(post => {
        const date = new Date(post.createdAt).toISOString().split('T')[0]
        activityByDate[date] = (activityByDate[date] || 0) + 1
      })

      // Calculate current streak
      let streak = 0
      const today = new Date()
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        if (activityByDate[dateStr]) {
          streak++
        } else if (i > 0) {
          break
        }
      }

      // Calculate this week's activity
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const thisWeek = posts.filter(p => p.createdAt > oneWeekAgo).length

      // Get pods joined
      const podsJoined = currentUser.joinedPods?.length || 0

      // Prepare heatmap data (last 365 days)
      const heatmapData = []
      for (let i = 364; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        heatmapData.push({
          date: dateStr,
          count: activityByDate[dateStr] || 0
        })
      }

      // Prepare weekly chart data (last 8 weeks)
      const weeklyActivity = []
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - (i * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        
        const weekPosts = posts.filter(p => {
          const postDate = new Date(p.createdAt)
          return postDate >= weekStart && postDate <= weekEnd
        })
        
        weeklyActivity.push({
          week: `Week ${8 - i}`,
          proofs: weekPosts.length
        })
      }

      setStats({
        totalProofs,
        currentStreak: streak,
        podsJoined,
        thisWeek
      })
      setActivityData(heatmapData)
      setWeeklyData(weeklyActivity)
    } catch (error) {
      trackError(error, { action: 'fetchAnalytics', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center text-zinc-400">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-white mb-8">Your Analytics</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm font-medium">Total Proofs</span>
            <Target className="w-5 h-5 text-brand-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalProofs}</div>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm font-medium">Current Streak</span>
            <Flame className="w-5 h-5 text-glow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.currentStreak} days</div>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm font-medium">Pods Joined</span>
            <Users className="w-5 h-5 text-brand-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.podsJoined}</div>
        </div>

        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-sm font-medium">This Week</span>
            <TrendingUp className="w-5 h-5 text-glow-500" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.thisWeek} proofs</div>
        </div>
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
