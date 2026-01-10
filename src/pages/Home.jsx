import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import Card from '../components/Card'
import Magnetic from '../components/Magnetic'
import StreakReminder from '../components/StreakReminder'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore'
import { Flame, Calendar, Target, Trophy, TrendingUp, Users, Clock, ArrowRight, Sparkles, Zap, Star, Award, BookOpen, MessageCircle, Heart, CheckCircle, Lightbulb, RefreshCw } from 'lucide-react'
import { getUserAchievements, ACHIEVEMENTS, getAchievementProgress } from '../lib/achievements'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

// Lazy load heavy components
const BlackHoleCanvas = lazy(() => import('../components/BlackHoleCanvas'))
const LandingPage = lazy(() => import('../components/LandingPage'))

// Daily tips data
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

// Loading fallback for lazy components
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
  </div>
)

export default function Home(){
  const { currentUser } = useAuth()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [nextEvent, setNextEvent] = useState(null)
  const [userStats, setUserStats] = useState({ streak: 0, totalProofs: 0, weeklyProofs: 0 })
  const [leaderboard, setLeaderboard] = useState([])
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [activityFeed, setActivityFeed] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(true)
  const [achievements, setAchievements] = useState([])
  const [achievementProgress, setAchievementProgress] = useState({})
  const [dailyTip, setDailyTip] = useState(DAILY_TIPS[0])
  const [tipIndex, setTipIndex] = useState(0)

  // Animation variants - disabled when user prefers reduced motion
  const fadeInUp = useMemo(() => prefersReducedMotion ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  }, [prefersReducedMotion])

  const staggerDelay = useCallback((index) =>
    prefersReducedMotion ? 0 : index * 0.05
  , [prefersReducedMotion])

  // Fetch next upcoming event
  useEffect(() => {
    if (!currentUser) return

    const fetchNextEvent = async () => {
      try {
        const now = Date.now()
        const q = query(
          collection(db, 'events'),
          where('date', '>', now),
          orderBy('date', 'asc'),
          limit(1)
        )
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          setNextEvent({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() })
        }
      } catch (error) {
        console.error('Error fetching event:', error)
      } finally {
        setLoadingEvent(false)
      }
    }

    fetchNextEvent()
  }, [currentUser])

  // Get user stats from currentUser
  useEffect(() => {
    if (currentUser) {
      setUserStats({
        streak: currentUser.streak || 0,
        totalProofs: currentUser.totalProofs || 0,
        weeklyProofs: 0 // Will be calculated from proofs
      })
    }
  }, [currentUser])

  // Fetch weekly proofs count
  useEffect(() => {
    if (!currentUser?.uid) return

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const q = query(
      collection(db, 'proofs'),
      where('authorId', '==', currentUser.uid),
      where('createdAt', '>=', weekAgo)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserStats(prev => ({ ...prev, weeklyProofs: snapshot.size }))
    }, (error) => {
      console.error('Error fetching weekly proofs:', error)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  // Fetch leaderboard (top 5 by streak)
  useEffect(() => {
    if (!currentUser) return

    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('streak', 'desc'),
          limit(5)
        )
        const snapshot = await getDocs(q)
        setLeaderboard(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      }
    }

    fetchLeaderboard()
  }, [currentUser])

  // Fetch activity feed (recent proofs from all pods)
  useEffect(() => {
    if (!currentUser) return

    const fetchActivity = async () => {
      try {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const q = query(
          collection(db, 'proofs'),
          where('createdAt', '>=', weekAgo),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
        const snapshot = await getDocs(q)
        const activities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'proof'
        }))
        setActivityFeed(activities)
      } catch (error) {
        console.error('Error fetching activity:', error)
      } finally {
        setLoadingActivity(false)
      }
    }

    fetchActivity()
  }, [currentUser])

  // Load user achievements
  useEffect(() => {
    if (!currentUser) return

    const userAchievementIds = currentUser.achievements || []
    const userAchievements = getUserAchievements(userAchievementIds)
    setAchievements(userAchievements)

    // Calculate progress for all achievements
    const stats = {
      streak: currentUser.streak || 0,
      totalProofs: currentUser.totalProofs || 0,
      podsJoined: currentUser.joinedPods?.length || 0
    }
    setAchievementProgress(getAchievementProgress(stats))
  }, [currentUser])

  // Daily tip - rotate based on day
  useEffect(() => {
    const today = new Date()
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const index = dayOfYear % DAILY_TIPS.length
    setTipIndex(index)
    setDailyTip(DAILY_TIPS[index])
  }, [])

  // Cycle to next tip - memoized callback
  const nextTip = useCallback(() => {
    const newIndex = (tipIndex + 1) % DAILY_TIPS.length
    setTipIndex(newIndex)
    setDailyTip(DAILY_TIPS[newIndex])
  }, [tipIndex])

  // Format relative time - memoized callback
  const formatRelativeTime = useCallback((timestamp) => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [])

  // Format event time - memoized callback
  const formatEventTime = useCallback((timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }, [])

  // Memoized computed values
  const goals = useMemo(() => currentUser?.goals || [], [currentUser?.goals])
  const joinedPods = useMemo(() => currentUser?.joinedPods || [], [currentUser?.joinedPods])
  const goalProgress = useMemo(() =>
    goals.length > 0 ? Math.min(100, Math.round((joinedPods.length / Math.max(1, goals.length)) * 100)) : 0
  , [goals.length, joinedPods.length])

  // Show landing page for non-authenticated visitors
  if (!currentUser) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPage />
      </Suspense>
    )
  }

  // Authenticated users see the dashboard
  const { scrollYProgress } = useScroll()
  const intensity = useTransform(scrollYProgress, [0, 0.25, 1], [1.0, 1.35, 1.6])
  const heroY = useTransform(scrollYProgress, [0, 0.25], prefersReducedMotion ? [0, 0] : [0, -30])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.85])

  return (
    <section className="relative overflow-hidden">
      {/* Streak Reminder - shows when user hasn't posted today */}
      <StreakReminder />

      {/* 3D background - lazy loaded */}
      <motion.div style={{ opacity: heroOpacity }} className="hidden sm:block">
        <Suspense fallback={<div className="absolute inset-0 bg-night-900" />}>
          <BlackHoleCanvas intensity={intensity} />
        </Suspense>
      </motion.div>
      {/* Mobile: simpler gradient background for performance */}
      <div className="sm:hidden absolute inset-0 bg-gradient-to-br from-night-900 via-night-800 to-night-900">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-glow-500/20 to-brand-500/10 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />
      <div className="pointer-events-none absolute right-0 top-0 w-1/2 h-full bg-[radial-gradient(600px_420px_at_right_center,rgba(255,179,107,0.08),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-8 sm:pt-16 pb-8 sm:pb-16">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          {/* LEFT: hero copy */}
          <motion.div style={{ y: heroY }}>
            <motion.h1
              {...fadeInUp}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
              className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight"
            >
              Welcome back,<br className="hidden sm:block"/>
              <span className="bg-gradient-to-r from-brand-400 to-glow-400 bg-clip-text text-transparent">
                {currentUser?.displayName?.split(' ')[0] || 'Explorer'}
              </span>
            </motion.h1>

            <motion.p
              {...fadeInUp}
              transition={{ duration: prefersReducedMotion ? 0 : 0.65, delay: prefersReducedMotion ? 0 : 0.05 }}
              className="mt-3 sm:mt-4 text-base sm:text-lg text-zinc-300 max-w-2xl"
            >
              {userStats.streak > 0
                ? `You're on a ${userStats.streak}-day streak! Keep the momentum going.`
                : "Start your learning journey today. Post your first proof to begin a streak!"}
            </motion.p>

            <motion.div
              {...fadeInUp}
              transition={{ duration: prefersReducedMotion ? 0 : 0.7, delay: prefersReducedMotion ? 0 : 0.1 }}
              className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
            >
              <Magnetic disabled={window.innerWidth < 640}>
                <Link to="/pods" className="btn-primary focus-out text-center py-3 sm:py-2">Post a Proof</Link>
              </Magnetic>
              <Magnetic disabled={window.innerWidth < 640}>
                <Link to="/matches" className="btn-ghost focus-out text-center py-3 sm:py-2">Find Peers</Link>
              </Magnetic>
            </motion.div>
          </motion.div>

          {/* RIGHT: visual space to let the black hole breathe - hidden on mobile */}
          <div className="relative min-h-[200px] sm:min-h-[440px] hidden lg:block"></div>
        </div>

        {/* Daily Tip Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="glass p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0`}>
              <dailyTip.icon className={`w-5 h-5 ${dailyTip.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-400">DAILY TIP</span>
                <Sparkles className="w-3 h-3 text-yellow-400" />
              </div>
              <p className="text-sm text-zinc-200">{dailyTip.text}</p>
            </div>
            <button
              onClick={nextTip}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Next tip"
            >
              <RefreshCw className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </motion.div>

        {/* Stats Row - Streak, Weekly Progress, Total Proofs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <Magnetic className="block">
            <Card title="Current Streak" className="relative overflow-hidden">
              <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{boxShadow: userStats.streak >= 7 ? '0 0 60px rgba(255,150,50,0.3)' : 'none'}} />
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${userStats.streak >= 7 ? 'bg-gradient-to-br from-orange-500 to-red-500' : userStats.streak >= 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-white/10'}`}>
                  <Flame className={`w-8 h-8 ${userStats.streak >= 3 ? 'text-white' : 'text-zinc-400'}`} />
                </div>
                <div>
                  <div className="text-4xl font-bold text-white">{userStats.streak}</div>
                  <div className="text-sm text-zinc-400">{userStats.streak === 1 ? 'day' : 'days'} in a row</div>
                </div>
              </div>
              {userStats.streak >= 7 && (
                <div className="mt-3 px-3 py-1.5 bg-orange-500/20 rounded-lg text-xs text-orange-300 text-center">
                  You're on fire! Keep it going!
                </div>
              )}
              {userStats.streak === 0 && (
                <Link to="/pods" className="mt-3 block text-center">
                  <span className="text-sm text-brand-400 hover:text-brand-300">Start your streak today →</span>
                </Link>
              )}
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="This Week">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-white">{userStats.weeklyProofs}</div>
                  <div className="text-sm text-zinc-400">proofs shared</div>
                </div>
              </div>
              <Link to="/analytics" className="mt-3 block text-center">
                <span className="text-sm text-brand-400 hover:text-brand-300">View analytics →</span>
              </Link>
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="Total Progress">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-glow-400 to-glow-600 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="text-4xl font-bold text-white">{userStats.totalProofs}</div>
                  <div className="text-sm text-zinc-400">total proofs</div>
                </div>
              </div>
              <Link to="/profile" className="mt-3 block text-center">
                <span className="text-sm text-brand-400 hover:text-brand-300">View profile →</span>
              </Link>
            </Card>
          </Magnetic>
        </div>

        {/* Cards Row 2 - Goals, Leaderboard, Events, Quick Actions */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Goal Progress Card */}
          <Magnetic className="block">
            <Card title="Goal Progress">
              {goals.length > 0 ? (
                <>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Active goals</span>
                      <span className="text-white font-medium">{goals.length}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-glow-400 rounded-full transition-all duration-500"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {goals.slice(0, 2).map((goal, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Target className="w-4 h-4 text-brand-400" />
                        <span className="text-zinc-300 truncate">{goal}</span>
                      </div>
                    ))}
                  </div>
                  <Link to="/profile" className="mt-3 flex items-center justify-center gap-1 text-sm text-brand-400 hover:text-brand-300">
                    Manage goals <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-zinc-400 mb-3">Set goals to track your progress</p>
                  <Link to="/profile" className="btn-primary text-sm">Add Goals</Link>
                </div>
              )}
            </Card>
          </Magnetic>

          {/* Mini Leaderboard */}
          <Magnetic className="block">
            <Card title="Top Streaks">
              <div className="space-y-2">
                {leaderboard.slice(0, 3).map((user, i) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-zinc-400 text-black' : 'bg-orange-700 text-white'}`}>
                      {i + 1}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 flex items-center justify-center text-xs text-white font-medium">
                      {user.displayName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="text-sm text-zinc-300 truncate flex-1">{user.displayName || 'Anonymous'}</span>
                    <div className="flex items-center gap-1 text-orange-400 text-sm">
                      <Flame className="w-3 h-3" />
                      {user.streak || 0}
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-2">No streaks yet</p>
                )}
              </div>
            </Card>
          </Magnetic>

          {/* Journal Quick Access */}
          <Magnetic className="block">
            <Link to="/journal">
              <Card title="Journal">
                <p className="text-sm text-zinc-300 mb-3">Reflect on your learning journey</p>
                <div className="flex flex-wrap gap-2">
                  {['Calm','Focused','Happy'].map(m => (
                    <span key={m} className="pill">{m}</span>
                  ))}
                </div>
                <div className="mt-3 text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  Write entry <ArrowRight className="w-4 h-4" />
                </div>
              </Card>
            </Link>
          </Magnetic>

          {/* Dynamic Today's Event Card */}
          <Magnetic className="block">
            <Card title="Upcoming Event">
              {loadingEvent ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              ) : nextEvent ? (
                <Link to="/events" className="block">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{nextEvent.title}</h4>
                      <div className="flex items-center gap-1 text-sm text-zinc-400 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatEventTime(nextEvent.date)}
                      </div>
                      {nextEvent.attendees?.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-zinc-500 mt-1">
                          <Users className="w-3 h-3" />
                          {nextEvent.attendees.length} attending
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                    View all events <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-zinc-400 mb-2">No upcoming events</p>
                  <Link to="/events" className="text-sm text-brand-400 hover:text-brand-300">
                    Browse past events →
                  </Link>
                </div>
              )}
            </Card>
          </Magnetic>
        </div>

        {/* Achievements & Activity Row */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Achievements Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card title="Your Achievements">
              {achievements.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {achievements.slice(0, 6).map((achievement) => (
                      <div
                        key={achievement.id}
                        className="group relative"
                        title={`${achievement.name}: ${achievement.description}`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-glow-500/20 border border-white/10 flex items-center justify-center text-2xl hover:scale-110 transition-transform cursor-pointer">
                          {achievement.icon}
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-night-800 border border-white/10 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {achievement.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/profile" className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300">
                    View all {achievements.length} achievements <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Award className="w-8 h-8 text-zinc-500" />
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">No achievements yet</p>
                  <p className="text-xs text-zinc-500 mb-3">Post proofs, build streaks, and join pods to earn badges!</p>

                  {/* Show next achievement progress */}
                  {achievementProgress['first_proof'] && (
                    <div className="text-left p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📝</span>
                        <span className="text-sm text-white font-medium">First Step</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-glow-400 rounded-full"
                          style={{ width: `${achievementProgress['first_proof'].percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {achievementProgress['first_proof'].current}/{achievementProgress['first_proof'].required} proofs
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card title="Community Activity">
              {loadingActivity ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-700 rounded-full" />
                      <div className="flex-1">
                        <div className="h-3 bg-zinc-700 rounded w-3/4 mb-1" />
                        <div className="h-2 bg-zinc-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityFeed.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto hide-scrollbar">
                  {activityFeed.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-glow-500 flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
                        {activity.authorName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-300">
                          <span className="font-medium text-white">{activity.authorName || 'Someone'}</span>
                          {' '}posted in{' '}
                          <span className="text-brand-400">{activity.podName || 'a pod'}</span>
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{activity.content}</p>
                        <span className="text-xs text-zinc-600">{formatRelativeTime(activity.createdAt)}</span>
                      </div>
                      {activity.reactions && Object.keys(activity.reactions).length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <Heart className="w-3 h-3" />
                          {Object.values(activity.reactions).reduce((a, b) => a + b.length, 0)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">No recent activity</p>
                  <p className="text-xs text-zinc-500 mt-1">Be the first to post a proof today!</p>
                </div>
              )}
              {activityFeed.length > 0 && (
                <Link to="/pods" className="mt-3 flex items-center justify-center gap-1 text-sm text-brand-400 hover:text-brand-300">
                  View all activity <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <div className="glass p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">QUICK ACTIONS</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                to="/pods"
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">Post Proof</span>
                  <p className="text-xs text-zinc-500">Share your progress</p>
                </div>
              </Link>
              <Link
                to="/journal"
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">Journal</span>
                  <p className="text-xs text-zinc-500">Write a reflection</p>
                </div>
              </Link>
              <Link
                to="/matches"
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">Find Partner</span>
                  <p className="text-xs text-zinc-500">Get accountability</p>
                </div>
              </Link>
              <Link
                to="/leaderboard"
                className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">Leaderboard</span>
                  <p className="text-xs text-zinc-500">See top learners</p>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
