/**
 * Firebase Cloud Messaging (FCM) Push Notifications Service
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from './firebase'
import toast from 'react-hot-toast'

let messaging = null

// Initialize messaging (must be called in browser)
export function initializeMessaging(app) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      messaging = getMessaging(app)
      return messaging
    } catch (error) {
      console.error('Failed to initialize messaging:', error)
      return null
    }
  }
  return null
}

// Check if notifications are supported
export function isNotificationSupported() {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
}

// Get current permission status
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

// Request notification permission and get FCM token
export async function requestNotificationPermission(userId) {
  if (!isNotificationSupported()) {
    toast.error('Push notifications are not supported on this device')
    return null
  }

  try {
    const permission = await Notification.requestPermission()

    if (permission === 'granted') {
      const token = await getFCMToken(userId)
      if (token) {
        toast.success('Notifications enabled!')
        return token
      }
    } else if (permission === 'denied') {
      toast.error('Notification permission denied')
    }

    return null
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    toast.error('Failed to enable notifications')
    return null
  }
}

// Get FCM token and save to user profile
async function getFCMToken(userId) {
  if (!messaging) {
    console.error('Messaging not initialized')
    return null
  }

  try {
    // Get the FCM token
    // Note: You need to add your VAPID key from Firebase Console > Project Settings > Cloud Messaging
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    })

    if (token && userId) {
      // Save token to user's profile in Firestore
      await updateDoc(doc(db, 'users', userId), {
        fcmTokens: arrayUnion(token),
        notificationsEnabled: true
      })
    }

    return token
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

// Remove FCM token (when user disables notifications)
export async function removeNotificationToken(userId, token) {
  if (!userId || !token) return

  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmTokens: arrayRemove(token),
      notificationsEnabled: false
    })
  } catch (error) {
    console.error('Error removing FCM token:', error)
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback) {
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload)

    // Show toast notification for foreground messages
    const { title, body } = payload.notification || {}
    if (title) {
      toast(body || title, {
        icon: '🔔',
        duration: 5000,
      })
    }

    // Call custom callback if provided
    callback?.(payload)
  })
}

// Send notification via Cloud Function (you'll need to create this)
export async function sendNotification(recipientId, notification) {
  // This would typically call a Cloud Function that sends the notification
  // For now, we'll just log it
  console.log('Would send notification to:', recipientId, notification)

  // Example Cloud Function call:
  // const sendNotificationFn = httpsCallable(functions, 'sendNotification')
  // await sendNotificationFn({ recipientId, ...notification })
}

// Notification types for the app
export const NotificationTypes = {
  NEW_MATCH: 'new_match',
  NEW_MESSAGE: 'new_message',
  POD_ACTIVITY: 'pod_activity',
  STREAK_REMINDER: 'streak_reminder',
  EVENT_REMINDER: 'event_reminder',
}

// Create notification payload
export function createNotificationPayload(type, data) {
  const payloads = {
    [NotificationTypes.NEW_MATCH]: {
      title: 'New Match! 🎉',
      body: `You matched with ${data.userName}!`,
      data: { type, matchId: data.matchId },
    },
    [NotificationTypes.NEW_MESSAGE]: {
      title: `Message from ${data.senderName}`,
      body: data.preview || 'New message',
      data: { type, chatId: data.chatId },
    },
    [NotificationTypes.POD_ACTIVITY]: {
      title: `Activity in ${data.podName}`,
      body: data.message || 'New activity in your pod',
      data: { type, podSlug: data.podSlug },
    },
    [NotificationTypes.STREAK_REMINDER]: {
      title: "Don't lose your streak! 🔥",
      body: `You have a ${data.streak} day streak. Keep it going!`,
      data: { type },
    },
    [NotificationTypes.EVENT_REMINDER]: {
      title: `Event starting soon: ${data.eventName}`,
      body: data.message || 'Your event is about to start',
      data: { type, eventId: data.eventId },
    },
  }

  return payloads[type] || { title: 'Cosmos', body: 'You have a notification' }
}
