import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import Card from '../components/Card'
import Magnetic from '../components/Magnetic'
import StreakReminder from '../components/StreakReminder'
import { DailyTip, DAILY_TIPS, StatsCards, QuickActions, ActivityFeed } from '../components/home'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, query, where, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore'
import { Calendar, Target, Users, Clock, ArrowRight, Award, Flame } from 'lucide-react'
import { getUserAchievements, getAchievementProgress } from '../lib/achievements'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'

// Lazy load heavy components
const BlackHoleCanvas = lazy(() => import('../components/BlackHoleCanvas'))
const LandingPage = lazy(() => import('../components/LandingPage'))

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

  // Batch fetch: event, leaderboard, and activity in parallel (reduces RTT)
  useEffect(() => {
    if (!currentUser) return

    const fetchHomeData = async () => {
      const now = Date.now()
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000

      // Build all queries
      const eventQuery = query(
        collection(db, 'events'),
        where('date', '>', now),
        orderBy('date', 'asc'),
        limit(1)
      )

      const leaderboardQuery = query(
        collection(db, 'users'),
        orderBy('streak', 'desc'),
        limit(5)
      )

      const activityQuery = query(
        collection(db, 'proofs'),
        where('createdAt', '>=', weekAgo),
        orderBy('createdAt', 'desc'),
        limit(10)
      )

      // Execute all queries in parallel
      try {
        const [eventSnapshot, leaderboardSnapshot, activitySnapshot] = await Promise.all([
          getDocs(eventQuery).catch(() => null),
          getDocs(leaderboardQuery).catch(() => ({ docs: [] })),
          getDocs(activityQuery).catch(() => ({ docs: [] }))
        ])

        // Process results
        if (eventSnapshot && !eventSnapshot.empty) {
          setNextEvent({ id: eventSnapshot.docs[0].id, ...eventSnapshot.docs[0].data() })
        }

        setLeaderboard(leaderboardSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))

        setActivityFeed(activitySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'proof'
        })))
      } catch (error) {
        console.error('Error fetching home data:', error)
      } finally {
        setLoadingEvent(false)
        setLoadingActivity(false)
      }
    }

    fetchHomeData()
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

  // Real-time listener for weekly proofs count (stays separate for live updates)
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

  // Scroll-based animations - must be called unconditionally (React Hooks rule)
  const { scrollYProgress } = useScroll()
  const intensity = useTransform(scrollYProgress, [0, 0.25, 1], [1.0, 1.35, 1.6])
  const heroY = useTransform(scrollYProgress, [0, 0.25], prefersReducedMotion ? [0, 0] : [0, -30])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.85])

  // Show landing page for non-authenticated visitors
  if (!currentUser) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPage />
      </Suspense>
    )
  }

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
        <DailyTip tip={dailyTip} onNextTip={nextTip} />

        {/* Stats Row - Streak, Weekly Progress, Total Proofs */}
        <StatsCards userStats={userStats} />

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
          <ActivityFeed activities={activityFeed} loading={loadingActivity} />
        </div>

        {/* Quick Actions Bar */}
        <QuickActions />

      </div>
    </section>
  )
}
