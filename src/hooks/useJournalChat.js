/**
 * useJournalChat — Manages AI chat state, sessions, and message sending
 */

import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore'

const functions = getFunctions()
const journalChatFn = httpsCallable(functions, 'journalChat')

export default function useJournalChat(userId) {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Load chat sessions
  useEffect(() => {
    if (!userId) return

    const sessionsRef = collection(db, 'users', userId, 'chatSessions')
    const q = query(sessionsRef, orderBy('updatedAt', 'desc'), limit(20))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setSessions(sessionsList)
      setLoadingSessions(false)
    }, (err) => {
      console.error('Error loading chat sessions:', err)
      setLoadingSessions(false)
    })

    return unsubscribe
  }, [userId])

  // Listen to messages for active session
  useEffect(() => {
    if (!userId || !activeSessionId) {
      setMessages([])
      return
    }

    const messagesRef = collection(
      db,
      'users',
      userId,
      'chatSessions',
      activeSessionId,
      'messages'
    )
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setMessages(msgs)
    })

    return unsubscribe
  }, [userId, activeSessionId])

  // Send a message
  const sendMessage = useCallback(
    async (message) => {
      if (!message.trim() || sending) return

      setSending(true)
      setError(null)

      try {
        const result = await journalChatFn({
          sessionId: activeSessionId,
          message: message.trim(),
        })

        const data = result.data

        // If this was a new session, set the active session
        if (!activeSessionId && data.sessionId) {
          setActiveSessionId(data.sessionId)
        }

        return data
      } catch (err) {
        const errorMessage =
          err.code === 'functions/resource-exhausted'
            ? err.message
            : 'Failed to send message. Please try again.'
        setError(errorMessage)
        throw err
      } finally {
        setSending(false)
      }
    },
    [activeSessionId, sending]
  )

  // Start a new chat
  const startNewChat = useCallback(() => {
    setActiveSessionId(null)
    setMessages([])
    setError(null)
  }, [])

  // Select a session
  const selectSession = useCallback((sessionId) => {
    setActiveSessionId(sessionId)
    setError(null)
  }, [])

  // Delete a session
  const deleteSession = useCallback(
    async (sessionId) => {
      if (!userId) return

      try {
        // Delete all messages in the session first
        const messagesRef = collection(
          db,
          'users',
          userId,
          'chatSessions',
          sessionId,
          'messages'
        )
        const messagesSnapshot = await getDocs(messagesRef)
        const deletePromises = messagesSnapshot.docs.map((msgDoc) =>
          deleteDoc(msgDoc.ref)
        )
        await Promise.all(deletePromises)

        // Delete the session document
        await deleteDoc(doc(db, 'users', userId, 'chatSessions', sessionId))

        // If this was the active session, clear it
        if (activeSessionId === sessionId) {
          setActiveSessionId(null)
          setMessages([])
        }
      } catch (err) {
        console.error('Error deleting session:', err)
        setError('Failed to delete chat session.')
      }
    },
    [userId, activeSessionId]
  )

  return {
    sessions,
    activeSessionId,
    messages,
    sending,
    error,
    loadingSessions,
    sendMessage,
    startNewChat,
    selectSession,
    deleteSession,
  }
}
