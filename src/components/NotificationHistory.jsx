/**
 * Notification History Panel
 *
 * Shows the last 20 WhatsApp notifications sent to the user
 * with delivery status indicators.
 */

import React, { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { History, MessageSquare, AlertTriangle, CheckCheck, Check, Clock, X } from 'lucide-react'

const TYPE_CONFIG = {
  morning_routine: { label: 'Morning', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  streak_alert: { label: 'Streak', color: 'text-red-400', bg: 'bg-red-400/10' },
  pod_update: { label: 'Pod', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  learning_nudge: { label: 'Learn', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  journal_insight: { label: 'Journal', color: 'text-green-400', bg: 'bg-green-400/10' },
  project_reminder: { label: 'Project', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
}

const STATUS_CONFIG = {
  queued: { icon: Clock, color: 'text-zinc-400', label: 'Queued' },
  sent: { icon: Check, color: 'text-yellow-400', label: 'Sent' },
  delivered: { icon: CheckCheck, color: 'text-blue-400', label: 'Delivered' },
  read: { icon: CheckCheck, color: 'text-green-400', label: 'Read' },
  failed: { icon: X, color: 'text-red-400', label: 'Failed' },
}

export default function NotificationHistory() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'notificationLogs'),
      where('userId', '==', currentUser.uid),
      orderBy('sentAt', 'desc'),
      limit(20)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setNotifications(logs)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading notification history:', error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [currentUser?.uid])

  function formatTimestamp(timestamp) {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  }

  if (loading) {
    return (
      <div className="glass p-6 rounded-2xl animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/5 rounded-lg mb-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h3 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <History size={20} />
        Notification History
      </h3>
      <p className="text-sm text-zinc-400 mb-4">
        Last 20 WhatsApp notifications
      </p>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
          <p>No notifications sent yet</p>
          <p className="text-xs mt-1">
            Enable WhatsApp notifications to start receiving personalized messages
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const typeConf = TYPE_CONFIG[notif.type] || {
              label: notif.type,
              color: 'text-zinc-400',
              bg: 'bg-zinc-400/10',
            }
            const statusConf = STATUS_CONFIG[notif.status] || STATUS_CONFIG.queued
            const StatusIcon = statusConf.icon

            return (
              <div
                key={notif.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition"
              >
                {/* Type Badge */}
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${typeConf.color} ${typeConf.bg}`}
                >
                  {typeConf.label}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">
                    {notif.messagePreview || 'No preview available'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatTimestamp(notif.sentAt)}
                    {notif.costCategory === 'free_window' && (
                      <span className="ml-2 text-green-500">Free</span>
                    )}
                  </p>
                </div>

                {/* Status */}
                <div className={`shrink-0 flex items-center gap-1 ${statusConf.color}`}>
                  <StatusIcon size={14} />
                  <span className="text-xs">{statusConf.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {notifications.some((n) => n.status === 'failed') && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300">
            Some messages failed to deliver. This usually means the phone number is not on WhatsApp or the template was rejected.
          </div>
        </div>
      )}
    </div>
  )
}
