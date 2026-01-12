import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { Calendar, Trash2, Search, AlertCircle, Pencil, X, Check, Sparkles, TrendingUp, BarChart3, Lightbulb, RefreshCw, BookOpen, Flame, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import { getDateKey, calculateStreaks, getWeekBoundaries, normalizeDate, daysAgo } from '../utils/dateUtils'

const MOODS = [
  { name: 'Calm', emoji: '😌', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Focused', emoji: '🎯', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Stressed', emoji: '😰', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { name: 'Anxious', emoji: '😟', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { name: 'Happy', emoji: '😊', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { name: 'Tired', emoji: '😴', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  { name: 'Motivated', emoji: '🔥', color: 'bg-brand-500/20 text-brand-400 border-brand-500/30' },
  { name: 'Grateful', emoji: '🙏', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
]

const WRITING_PROMPTS = [
  "What's one small win you had today?",
  "What are you grateful for right now?",
  "What's challenging you at the moment?",
  "What did you learn today that surprised you?",
  "How did you take care of yourself today?",
  "What's one thing you want to accomplish tomorrow?",
  "Describe a moment that made you smile today.",
  "What would you tell your past self from a week ago?",
  "What's been on your mind lately?",
  "What's one habit you're trying to build?",
  "How are you feeling about your learning progress?",
  "What obstacle did you overcome recently?"
]

export default function Journal(){
  const { currentUser } = useAuth()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('Calm')
  const [tags, setTags] = useState('')
  const [entries, setEntries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editMood, setEditMood] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [showInsights, setShowInsights] = useState(true)

  // Animation variants based on reduced motion preference
  const animationProps = useMemo(() => prefersReducedMotion ? {} : {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }, [prefersReducedMotion])

  // Get random prompt on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * WRITING_PROMPTS.length)
    setCurrentPrompt(WRITING_PROMPTS[randomIndex])
  }, [])

  // Refresh prompt - memoized
  const refreshPrompt = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * WRITING_PROMPTS.length)
    setCurrentPrompt(WRITING_PROMPTS[randomIndex])
  }, [])

  // Use prompt as starter - memoized
  const usePrompt = useCallback(() => {
    setContent(currentPrompt + '\n\n')
  }, [currentPrompt])

  // Calculate mood trends and insights
  const insights = useMemo(() => {
    if (entries.length === 0) return null

    // Mood distribution
    const moodCounts = {}
    entries.forEach(entry => {
      const m = entry.mood || 'Unknown'
      moodCounts[m] = (moodCounts[m] || 0) + 1
    })

    // Most common mood
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]

    // This week's entries using proper week boundaries
    const thisWeekBounds = getWeekBoundaries(0)
    const thisWeekEntries = entries.filter(e => {
      const ts = normalizeDate(e.createdAt).getTime()
      return ts >= thisWeekBounds.start && ts <= thisWeekBounds.end
    })

    // Journaling streak using centralized utility
    const streakData = calculateStreaks(entries.map(e => ({ date: e.createdAt })))
    const streak = streakData.current

    // Average words per entry (filter empty content)
    const validEntries = entries.filter(e => e.content && e.content.trim())
    const totalWords = validEntries.reduce((sum, e) => {
      // Count words properly - handle multiple spaces and newlines
      const words = e.content.trim().split(/\s+/).filter(w => w.length > 0)
      return sum + words.length
    }, 0)
    const avgWords = validEntries.length > 0 ? Math.round(totalWords / validEntries.length) : 0

    // Last 7 days mood data for chart using local timezone
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = daysAgo(i)
      const dateStr = getDateKey(date) // Uses local timezone
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

      const dayEntries = entries.filter(e => {
        if (!e.createdAt) return false
        return getDateKey(e.createdAt) === dateStr
      })

      last7Days.push({
        day: dayName,
        date: dateStr,
        count: dayEntries.length,
        moods: dayEntries.map(e => e.mood)
      })
    }

    return {
      totalEntries: entries.length,
      thisWeek: thisWeekEntries.length,
      topMood: topMood ? { name: topMood[0], count: topMood[1] } : null,
      moodCounts,
      streak,
      avgWords,
      last7Days
    }
  }, [entries])

  useEffect(() => {
    fetchEntries()
  }, [currentUser])

  async function fetchEntries() {
    if (!currentUser) return

    try {
      const q = query(
        collection(db, 'journal_entries'),
        where('userId', '==', currentUser.uid)
      )

      const snapshot = await getDocs(q)

      const entriesData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))

      // Sort manually
      entriesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

      setEntries(entriesData)
      setFetchError(null)
    } catch (error) {
      trackError(error, { action: 'fetchEntries', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      setFetchError(error.message)
      toast.error('Failed to load entries')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!content.trim()) {
      toast.error('Please write something first!')
      return
    }

    setLoading(true)

    try {
      const today = getDateKey(new Date()) // Local timezone date key
      const entryData = {
        userId: currentUser.uid,
        date: today,
        mood,
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: Date.now()
      }

      await addDoc(collection(db, 'journal_entries'), entryData)

      toast.success('Journal entry saved!')
      setContent('')
      setTags('')

      await fetchEntries()
    } catch (error) {
      trackError(error, { action: 'saveEntry', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to save entry')
    } finally {
      setLoading(false)
    }
  }

  async function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      await deleteDoc(doc(db, 'journal_entries', entryId))
      toast.success('Entry deleted')
      await fetchEntries()
    } catch (error) {
      trackError(error, { action: 'deleteEntry', entryId }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to delete entry')
    }
  }

  function startEditing(entry) {
    setEditingEntry(entry.id)
    setEditContent(entry.content || '')
    setEditMood(entry.mood || 'Calm')
  }

  function cancelEditing() {
    setEditingEntry(null)
    setEditContent('')
    setEditMood('')
  }

  async function saveEdit(entryId) {
    if (!editContent.trim()) {
      toast.error('Content cannot be empty')
      return
    }

    try {
      await updateDoc(doc(db, 'journal_entries', entryId), {
        content: editContent.trim(),
        mood: editMood,
        updatedAt: Date.now()
      })
      toast.success('Entry updated!')
      setEditingEntry(null)
      await fetchEntries()
    } catch (error) {
      trackError(error, { action: 'updateEntry', entryId }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to update entry')
    }
  }

  const filteredEntries = entries.filter(entry =>
    entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Get mood config
  const getMoodConfig = (moodName) => {
    return MOODS.find(m => m.name === moodName) || { name: moodName, emoji: '😐', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">Journal</h2>
          <p className="text-zinc-400 mt-1">Reflect on your learning journey</p>
        </div>
        {insights && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/20 rounded-lg">
              <Flame className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-brand-400">{insights.streak} day streak</span>
            </div>
          </div>
        )}
      </div>

      {fetchError && (
        <div className="glass p-4 rounded-xl mb-6 border border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-1" size={20} />
            <div>
              <p className="text-sm text-red-500 font-semibold mb-1">Firebase Error:</p>
              <p className="text-sm text-zinc-400">{fetchError}</p>
              <p className="text-xs text-zinc-500 mt-2">
                This might be a permissions or index issue. Check Firebase Console.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights Row */}
      {insights && showInsights && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="glass p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                YOUR INSIGHTS
              </h3>
              <button
                onClick={() => setShowInsights(false)}
                className="text-zinc-500 hover:text-zinc-300 text-xs"
              >
                Hide
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">{insights.totalEntries}</div>
                <div className="text-xs text-zinc-400">Total Entries</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">{insights.thisWeek}</div>
                <div className="text-xs text-zinc-400">This Week</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">{insights.avgWords}</div>
                <div className="text-xs text-zinc-400">Avg. Words</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-xl">
                {insights.topMood && (
                  <>
                    <div className="text-2xl">{getMoodConfig(insights.topMood.name).emoji}</div>
                    <div className="text-xs text-zinc-400">Top Mood</div>
                  </>
                )}
              </div>
            </div>

            {/* Last 7 days activity */}
            <div className="flex items-end justify-between gap-1 h-16">
              {insights.last7Days.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all ${
                      day.count > 0 ? 'bg-brand-500' : 'bg-white/10'
                    }`}
                    style={{ height: `${Math.max(4, day.count * 20)}px` }}
                    title={`${day.count} ${day.count === 1 ? 'entry' : 'entries'}`}
                  />
                  <span className="text-[10px] text-zinc-500">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Writing Prompt */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="glass p-4 rounded-2xl border border-yellow-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-400">WRITING PROMPT</span>
                <Sparkles className="w-3 h-3 text-yellow-400" />
              </div>
              <p className="text-sm text-zinc-200 mb-3">{currentPrompt}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={usePrompt}
                  className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs font-medium transition-colors"
                >
                  Use this prompt
                </button>
                <button
                  onClick={refreshPrompt}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="Get new prompt"
                >
                  <RefreshCw className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-400" />
            New Entry
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                How are you feeling? *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setMood(m.name)}
                    className={`p-2 rounded-xl border transition-all ${
                      mood === m.name
                        ? m.color + ' border-2 scale-105'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xl mb-1">{m.emoji}</div>
                    <div className="text-xs truncate">{m.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                What's on your mind? * 
                <span className="text-xs text-zinc-500 ml-2">
                  {content.length}/500
                </span>
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none min-h-[150px]"
                placeholder="Write your thoughts..."
                maxLength={500}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="productivity, goals, reflection"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        {/* Entries List */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Your Entries ({entries.length})</h3>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm"
            />
          </div>

          {/* Entries */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="glass p-6 rounded-2xl text-center text-zinc-400">
                {entries.length === 0 ? (
                  <>
                    <p className="mb-2">No entries yet.</p>
                    <p className="text-sm">Write your first entry to get started! →</p>
                  </>
                ) : (
                  <p>No entries match "{searchTerm}"</p>
                )}
              </div>
            ) : (
              filteredEntries.map(entry => (
                <div key={entry.id} className="glass p-5 rounded-2xl">
                  {editingEntry === entry.id ? (
                    /* Edit Mode */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Editing entry</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(entry.id)}
                            className="p-1.5 hover:bg-green-500/20 rounded-lg transition"
                            title="Save changes"
                            aria-label="Save changes"
                          >
                            <Check size={16} className="text-green-400" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition"
                            title="Cancel editing"
                            aria-label="Cancel editing"
                          >
                            <X size={16} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                      <select
                        value={editMood}
                        onChange={e => setEditMood(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm"
                      >
                        {MOODS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none min-h-[100px] text-sm"
                        maxLength={500}
                      />
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className="text-zinc-400" />
                          <span className="text-sm text-zinc-400">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown date'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border ${getMoodConfig(entry.mood).color}`}>
                            <span>{getMoodConfig(entry.mood).emoji}</span>
                            {entry.mood || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEditing(entry)}
                            className="p-1 hover:bg-brand-500/20 rounded-lg transition"
                            title="Edit entry"
                            aria-label="Edit entry"
                          >
                            <Pencil size={16} className="text-brand-400" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 hover:bg-red-500/20 rounded-lg transition"
                            title="Delete entry"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </div>

                      <p className="text-zinc-200 mb-3 whitespace-pre-wrap">
                        {entry.content || 'No content'}
                      </p>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-md bg-white/5 text-xs text-zinc-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
