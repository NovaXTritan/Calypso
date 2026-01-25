// NotificationCenter.jsx - In-app notification center with real-time updates
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
  getDocs,
  deleteDoc
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import {
  Bell,
  X,
  Heart,
  MessageCircle,
  Users,
  PartyPopper,
  Lightbulb,
  ThumbsUp,
  UserPlus,
  Calendar,
  CheckCheck,
  Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Notification type configurations
const NOTIFICATION_TYPES = {
  like: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  reaction: { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  celebrate: { icon: PartyPopper, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  insightful: { icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  helpful: { icon: ThumbsUp, color: 'text-green-400', bg: 'bg-green-500/20' },
  comment: { icon: MessageCircle, color: 'text-brand-400', bg: 'bg-brand-500/20' },
  match: { icon: UserPlus, color: 'text-glow-400', bg: 'bg-glow-500/20' },
  message: { icon: MessageCircle, color: 'text-brand-400', bg: 'bg-brand-500/20' },
  pod_join: { icon: Users, color: 'text-green-400', bg: 'bg-green-500/20' },
  event: { icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/20' }
}

// Format relative time
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationCenter() {
  const { currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Subscribe to notifications
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    let unsubscribe = null
    let isMounted = true

    const setupListener = async () => {
      try {
        // First, try a simple query without orderBy to check if collection/index exists
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        )

        unsubscribe = onSnapshot(
          notificationsQuery,
          (snapshot) => {
            if (!isMounted) return
            const notifs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              // Handle Firebase timestamp
              createdAt: doc.data().createdAt?.toMillis?.() || doc.data().createdAt || Date.now()
            }))
            setNotifications(notifs)
            setUnreadCount(notifs.filter(n => !n.read).length)
            setLoading(false)
          },
          (err) => {
            if (!isMounted) return
            // Check for missing index error
            if (err.code === 'failed-precondition' || err.message?.includes('index')) {
              console.warn('NotificationCenter: Firestore index required. Check console for index creation link.')
            }
            trackError(err, { action: 'subscribeNotifications', userId: currentUser.uid }, 'warn', ErrorCategory.FIRESTORE)
            setNotifications([])
            setUnreadCount(0)
            setLoading(false)
          }
        )
      } catch (err) {
        if (!isMounted) return
        trackError(err, { action: 'setupNotificationListener', userId: currentUser.uid }, 'warn', ErrorCategory.FIRESTORE)
        setLoading(false)
      }
    }

    // Small delay to avoid rapid listener setup/teardown in StrictMode
    const timeoutId = setTimeout(setupListener, 100)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [currentUser?.uid])

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!currentUser?.uid) return

    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      })
    } catch (err) {
      trackError(err, { action: 'markNotificationRead', notificationId }, 'warn', ErrorCategory.FIRESTORE)
    }
  }, [currentUser?.uid])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.uid) return

    try {
      const unreadNotifs = notifications.filter(n => !n.read)
      if (unreadNotifs.length === 0) return

      const batch = writeBatch(db)
      unreadNotifs.forEach(notif => {
        batch.update(doc(db, 'notifications', notif.id), { read: true })
      })
      await batch.commit()
    } catch (err) {
      trackError(err, { action: 'markAllNotificationsRead' }, 'warn', ErrorCategory.FIRESTORE)
    }
  }, [currentUser?.uid, notifications])

  // Delete a notification
  const deleteNotification = useCallback(async (e, notificationId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!currentUser?.uid) return

    try {
      await deleteDoc(doc(db, 'notifications', notificationId))
    } catch (err) {
      trackError(err, { action: 'deleteNotification', notificationId }, 'warn', ErrorCategory.FIRESTORE)
    }
  }, [currentUser?.uid])

  // Get notification link based on type
  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case 'like':
      case 'reaction':
      case 'celebrate':
      case 'insightful':
      case 'helpful':
      case 'comment':
        return notification.proofId ? `/pods` : null
      case 'match':
        return '/matches'
      case 'message':
        return notification.conversationId ? `/chat/${notification.conversationId}` : '/matches'
      case 'event':
        return '/events'
      case 'pod_join':
        return notification.podSlug ? `/pods/${notification.podSlug}` : '/pods'
      default:
        return null
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    setIsOpen(false)
  }

  // Get icon for notification type
  const getNotificationIcon = (notification) => {
    // For reactions, use the specific reaction type icon
    if (notification.type === 'reaction' && notification.reactionType) {
      const reactionConfig = NOTIFICATION_TYPES[notification.reactionType]
      if (reactionConfig) return reactionConfig
    }
    return NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.like
  }

  if (!currentUser) return null

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-zinc-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-400">No notifications yet</p>
                    <p className="text-sm text-zinc-500 mt-1">You'll see updates here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map(notification => {
                      const iconConfig = getNotificationIcon(notification)
                      const Icon = iconConfig.icon
                      const link = getNotificationLink(notification)

                      const content = (
                        <div
                          className={`group flex items-start gap-3 p-4 transition-colors ${
                            !notification.read ? 'bg-brand-500/5' : 'hover:bg-white/5'
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-lg ${iconConfig.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${iconConfig.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'text-white' : 'text-zinc-300'}`}>
                              {notification.message}
                            </p>
                            <span className="text-xs text-zinc-500">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>

                          {/* Unread indicator */}
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                          )}

                          {/* Delete button */}
                          <button
                            onClick={(e) => deleteNotification(e, notification.id)}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-400" />
                          </button>
                        </div>
                      )

                      return link ? (
                        <Link key={notification.id} to={link}>
                          {content}
                        </Link>
                      ) : (
                        <div key={notification.id} className="cursor-pointer">
                          {content}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
