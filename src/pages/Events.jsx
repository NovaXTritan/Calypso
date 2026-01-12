import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, orderBy, query, addDoc } from 'firebase/firestore'
import { Calendar, Clock, Users, MapPin, ExternalLink, Search, Filter, Plus, X, Tag, Bell, BellOff, Sparkles, ChevronDown, Video, BookOpen, MessageCircle, Zap, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import SEO from '../components/SEO'

// Event categories with icons and colors
const EVENT_CATEGORIES = [
  { id: 'workshop', name: 'Workshop', icon: BookOpen, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'livestream', name: 'Live Stream', icon: Video, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'discussion', name: 'Discussion', icon: MessageCircle, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'coworking', name: 'Co-working', icon: Users, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'challenge', name: 'Challenge', icon: Zap, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'other', name: 'Other', icon: Calendar, color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' }
]

export default function Events(){
  const { currentUser } = useAuth()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showMyEvents, setShowMyEvents] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('event_reminders')
    return saved ? JSON.parse(saved) : []
  })

  // Animation config
  const cardAnimation = useMemo(() => prefersReducedMotion ? {} : {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  }, [prefersReducedMotion])

  const staggerDelay = useCallback((index) =>
    prefersReducedMotion ? 0 : Math.min(index * 0.05, 0.25)
  , [prefersReducedMotion])

  // New event form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    category: 'workshop',
    date: '',
    time: '',
    duration: 60,
    maxAttendees: 20,
    link: ''
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'))
      const snapshot = await getDocs(q)
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEvents(eventsData)
    } catch (error) {
      trackError(error, { action: 'fetchEvents' }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  async function handleRSVP(eventId, isAttending) {
    if (!currentUser) return

    try {
      const eventRef = doc(db, 'events', eventId)

      if (isAttending) {
        // Remove from attendees
        await updateDoc(eventRef, {
          attendees: arrayRemove(currentUser.uid)
        })
      } else {
        // Add to attendees
        await updateDoc(eventRef, {
          attendees: arrayUnion(currentUser.uid)
        })
      }

      await fetchEvents()
    } catch (error) {
      trackError(error, { action: 'updateRSVP', eventId, userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to update RSVP')
    }
  }

  // Toggle reminder for an event
  function toggleReminder(eventId) {
    setReminders(prev => {
      const newReminders = prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
      localStorage.setItem('event_reminders', JSON.stringify(newReminders))
      toast.success(prev.includes(eventId) ? 'Reminder removed' : 'Reminder set!')
      return newReminders
    })
  }

  // Create new event
  async function handleCreateEvent(e) {
    e.preventDefault()
    if (!currentUser) return

    try {
      const dateTime = new Date(`${newEvent.date}T${newEvent.time}`)
      if (isNaN(dateTime.getTime())) {
        toast.error('Please enter a valid date and time')
        return
      }

      await addDoc(collection(db, 'events'), {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        category: newEvent.category,
        date: dateTime.getTime(),
        duration: newEvent.duration,
        maxAttendees: newEvent.maxAttendees,
        link: newEvent.link.trim(),
        attendees: [currentUser.uid],
        createdBy: currentUser.uid,
        createdAt: Date.now()
      })

      toast.success('Event created!')
      setShowCreateModal(false)
      setNewEvent({
        title: '',
        description: '',
        category: 'workshop',
        date: '',
        time: '',
        duration: 60,
        maxAttendees: 20,
        link: ''
      })
      await fetchEvents()
    } catch (error) {
      trackError(error, { action: 'createEvent', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to create event')
    }
  }

  // Get category config
  function getCategoryConfig(categoryId) {
    return EVENT_CATEGORIES.find(c => c.id === categoryId) || EVENT_CATEGORIES[5]
  }

  const now = Date.now()

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = [...events]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => e.category === selectedCategory)
    }

    // My events filter
    if (showMyEvents && currentUser) {
      filtered = filtered.filter(e => e.attendees?.includes(currentUser.uid))
    }

    return filtered
  }, [events, searchQuery, selectedCategory, showMyEvents, currentUser])

  const upcomingEvents = filteredEvents.filter(e => e.date > now)
  const pastEvents = filteredEvents.filter(e => e.date <= now)

  // Stats
  const myEventsCount = events.filter(e => e.attendees?.includes(currentUser?.uid) && e.date > now).length
  const totalUpcoming = events.filter(e => e.date > now).length

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading events...</p>
        </div>
      </section>
    )
  }

  const EventCard = ({ event, isPast = false }) => {
    const isAttending = event.attendees?.includes(currentUser?.uid)
    const isFull = event.attendees?.length >= event.maxAttendees
    const eventDate = new Date(event.date)
    const hasReminder = reminders.includes(event.id)
    const categoryConfig = getCategoryConfig(event.category)
    const CategoryIcon = categoryConfig.icon

    // Time until event
    const timeUntil = event.date - now
    const daysUntil = Math.floor(timeUntil / (1000 * 60 * 60 * 24))
    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60))

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass p-5 rounded-2xl ${isPast ? 'opacity-60' : ''} hover:border-brand-500/30 transition-colors`}
      >
        {/* Category Badge & Actions */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${categoryConfig.color}`}>
            <CategoryIcon size={12} />
            {categoryConfig.name}
          </span>
          <div className="flex items-center gap-2">
            {!isPast && (
              <button
                onClick={() => toggleReminder(event.id)}
                className={`p-1.5 rounded-lg transition-colors ${hasReminder ? 'bg-yellow-500/20 text-yellow-400' : 'hover:bg-white/10 text-zinc-400'}`}
                title={hasReminder ? 'Remove reminder' : 'Set reminder'}
              >
                {hasReminder ? <Bell size={16} /> : <BellOff size={16} />}
              </button>
            )}
            {isAttending && !isPast && (
              <span className="px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium">
                Going
              </span>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{event.description}</p>

        {/* Time until event */}
        {!isPast && timeUntil > 0 && timeUntil < 7 * 24 * 60 * 60 * 1000 && (
          <div className="mb-3 px-2.5 py-1.5 bg-brand-500/10 rounded-lg inline-flex items-center gap-1.5 text-xs text-brand-400">
            <Sparkles size={12} />
            {daysUntil > 0 ? `In ${daysUntil} day${daysUntil > 1 ? 's' : ''}` : `In ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`}
          </div>
        )}

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar size={14} />
            <span>{eventDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock size={14} />
            <span>
              {eventDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })} · {event.duration}min
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Users size={14} />
            <span>{event.attendees?.length || 0} / {event.maxAttendees}</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${Math.min(100, ((event.attendees?.length || 0) / event.maxAttendees) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {event.link && !isPast && (
          <a
            href={event.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 mb-3"
          >
            <ExternalLink size={14} />
            Join Link
          </a>
        )}

        {!isPast && (
          <button
            onClick={() => handleRSVP(event.id, isAttending)}
            disabled={!isAttending && isFull}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${
              isAttending
                ? 'bg-white/10 border border-white/20 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400'
                : isFull
                ? 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {isAttending ? 'Cancel RSVP' : isFull ? 'Event Full' : 'RSVP Now'}
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <SEO
        title="Events"
        description="Join community events, workshops, and live sessions. Connect with peers and learn together in real-time."
        path="/events"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="w-8 h-8 text-brand-400" />
            Community Events
          </h2>
          <p className="text-zinc-400 mt-1">Join live sessions, workshops, and community calls</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Create Event
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="glass p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-white">{totalUpcoming}</div>
          <div className="text-xs text-zinc-400">Upcoming</div>
        </div>
        <div className="glass p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-400">{myEventsCount}</div>
          <div className="text-xs text-zinc-400">My Events</div>
        </div>
        <div className="glass p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-yellow-400">{reminders.length}</div>
          <div className="text-xs text-zinc-400">Reminders Set</div>
        </div>
        <div className="glass p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-purple-400">{pastEvents.length}</div>
          <div className="text-xs text-zinc-400">Past Events</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass p-4 rounded-2xl mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
          >
            <option value="all">All Categories</option>
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* My Events Toggle */}
          <button
            onClick={() => setShowMyEvents(!showMyEvents)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              showMyEvents
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'bg-white/5 border border-white/10 hover:bg-white/10'
            }`}
          >
            My Events
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mt-4">
          {EVENT_CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                  selectedCategory === cat.id ? cat.color : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                }`}
              >
                <Icon size={12} />
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="mb-12">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          Upcoming Events
          <span className="text-sm text-zinc-400 font-normal">({upcomingEvents.length})</span>
        </h3>
        {upcomingEvents.length === 0 ? (
          <div className="glass p-8 rounded-2xl text-center">
            <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 mb-2">No upcoming events found</p>
            <p className="text-sm text-zinc-500 mb-6">
              {searchQuery || selectedCategory !== 'all' || showMyEvents
                ? 'Try adjusting your filters'
                : 'Be the first to create one!'}
            </p>

            {/* Event suggestions when no filters active */}
            {!searchQuery && selectedCategory === 'all' && !showMyEvents && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Ideas to get started</p>
                <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  <button
                    onClick={() => {
                      setNewEvent(prev => ({
                        ...prev,
                        title: 'Weekly Co-working Session',
                        description: 'Work together in a focused virtual room. Share progress and stay accountable.',
                        category: 'coworking',
                        duration: 120
                      }))
                      setShowCreateModal(true)
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors group"
                  >
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Users className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Co-working Session</div>
                      <div className="text-xs text-zinc-500">Work together virtually</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => {
                      setNewEvent(prev => ({
                        ...prev,
                        title: 'Skill Share: ',
                        description: 'Share your expertise with the community in a live workshop.',
                        category: 'workshop',
                        duration: 60
                      }))
                      setShowCreateModal(true)
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors group"
                  >
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Skill Share</div>
                      <div className="text-xs text-zinc-500">Teach something you know</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => {
                      setNewEvent(prev => ({
                        ...prev,
                        title: 'Weekly Challenge Kickoff',
                        description: 'Start a new weekly challenge together. Set goals and hold each other accountable.',
                        category: 'challenge',
                        duration: 30
                      }))
                      setShowCreateModal(true)
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors group"
                  >
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Zap className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Challenge Kickoff</div>
                      <div className="text-xs text-zinc-500">Start a group challenge</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => {
                      setNewEvent(prev => ({
                        ...prev,
                        title: 'Open Discussion: ',
                        description: 'An open discussion about topics that matter to the community.',
                        category: 'discussion',
                        duration: 45
                      }))
                      setShowCreateModal(true)
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-colors group"
                  >
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">Open Discussion</div>
                      <div className="text-xs text-zinc-500">Talk about what matters</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 text-zinc-400">Past Events ({pastEvents.length})</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pastEvents.slice(0, 6).map(event => (
              <EventCard key={event.id} event={event} isPast />
            ))}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-night-800 border border-white/10 rounded-2xl shadow-xl"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create Event</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    placeholder="Event title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 min-h-[80px]"
                    placeholder="What's this event about?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    {EVENT_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Time</label>
                    <input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration (min)</label>
                    <input
                      type="number"
                      value={newEvent.duration}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      min="15"
                      max="480"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Max Attendees</label>
                    <input
                      type="number"
                      value={newEvent.maxAttendees}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) || 20 }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                      min="2"
                      max="100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Meeting Link (optional)</label>
                  <input
                    type="url"
                    value={newEvent.link}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, link: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    placeholder="https://..."
                  />
                </div>

                <button type="submit" className="w-full btn-primary py-2.5">
                  Create Event
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
