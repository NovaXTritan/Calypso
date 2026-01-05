/**
 * Real-time Chat Service using Firestore
 *
 * Data Structure:
 * - conversations/{conversationId}
 *   - participants: [userId1, userId2]
 *   - participantData: { [id]: { name, photoURL } }
 *   - lastMessage: { text, senderId, timestamp }
 *   - createdAt: timestamp
 *   - updatedAt: timestamp
 *
 * - conversations/{conversationId}/messages/{messageId}
 *   - senderId: string
 *   - text: string
 *   - timestamp: timestamp
 *   - read: boolean
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore'
import { db } from './firebase'

// Get or create a conversation between two users
export async function getOrCreateConversation(currentUser, otherUser) {
  const conversationsRef = collection(db, 'conversations')

  // Check if conversation already exists
  const q = query(
    conversationsRef,
    where('participants', 'array-contains', currentUser.uid)
  )

  const snapshot = await getDocs(q)
  const existingConversation = snapshot.docs.find(doc => {
    const data = doc.data()
    return data.participants.includes(otherUser.uid)
  })

  if (existingConversation) {
    return {
      id: existingConversation.id,
      ...existingConversation.data()
    }
  }

  // Create new conversation
  const newConversation = {
    participants: [currentUser.uid, otherUser.uid],
    participantData: {
      [currentUser.uid]: {
        name: currentUser.displayName || 'Anonymous',
        photoURL: currentUser.photoURL || null
      },
      [otherUser.uid]: {
        name: otherUser.displayName || otherUser.name || 'Anonymous',
        photoURL: otherUser.photoURL || null
      }
    },
    lastMessage: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const docRef = await addDoc(conversationsRef, newConversation)
  return { id: docRef.id, ...newConversation }
}

// Subscribe to user's conversations
export function subscribeToConversations(userId, callback) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  )

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(conversations)
  }, (error) => {
    console.error('Error subscribing to conversations:', error)
    callback([])
  })
}

// Subscribe to messages in a conversation
export function subscribeToMessages(conversationId, callback) {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'asc')
  )

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(messages)
  }, (error) => {
    console.error('Error subscribing to messages:', error)
    callback([])
  })
}

// Send a message
export async function sendMessage(conversationId, senderId, text) {
  if (!text.trim()) return null

  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const conversationRef = doc(db, 'conversations', conversationId)

  // Add message
  const message = {
    senderId,
    text: text.trim(),
    timestamp: serverTimestamp(),
    read: false
  }

  const messageDoc = await addDoc(messagesRef, message)

  // Update conversation with last message
  await updateDoc(conversationRef, {
    lastMessage: {
      text: text.trim().substring(0, 100), // Preview text
      senderId,
      timestamp: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  })

  return { id: messageDoc.id, ...message }
}

// Mark messages as read
export async function markMessagesAsRead(conversationId, userId) {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages')
  const q = query(
    messagesRef,
    where('read', '==', false),
    where('senderId', '!=', userId)
  )

  try {
    const snapshot = await getDocs(q)
    const updates = snapshot.docs.map(docSnap =>
      updateDoc(doc(messagesRef, docSnap.id), { read: true })
    )
    await Promise.all(updates)
  } catch (error) {
    console.error('Error marking messages as read:', error)
  }
}

// Get unread message count for a user
export function subscribeToUnreadCount(userId, callback) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId)
  )

  return onSnapshot(q, async (snapshot) => {
    let totalUnread = 0

    for (const doc of snapshot.docs) {
      const lastMessage = doc.data().lastMessage
      if (lastMessage && lastMessage.senderId !== userId) {
        // Check if there are unread messages
        const messagesQuery = query(
          collection(db, 'conversations', doc.id, 'messages'),
          where('read', '==', false),
          where('senderId', '!=', userId)
        )
        const messagesSnapshot = await getDocs(messagesQuery)
        totalUnread += messagesSnapshot.size
      }
    }

    callback(totalUnread)
  })
}

// Get conversation by ID
export async function getConversation(conversationId) {
  const docRef = doc(db, 'conversations', conversationId)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() }
  }
  return null
}

// Format timestamp for display
export function formatMessageTime(timestamp) {
  if (!timestamp) return ''

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const now = new Date()
  const diff = now - date

  // Today
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getDate() === yesterday.getDate()) {
    return 'Yesterday'
  }

  // This week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }

  // Older
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
