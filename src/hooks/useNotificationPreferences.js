/**
 * Hook for managing WhatsApp notification preferences in Firestore.
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

const DEFAULT_PREFERENCES = {
  morningRoutine: true,
  streakAlerts: true,
  podUpdates: true,
  learningNudges: false,
  journalInsights: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  timezone: 'Asia/Kolkata',
}

export default function useNotificationPreferences(userId) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [phone, setPhone] = useState('')
  const [whatsappOptIn, setWhatsappOptIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Real-time listener
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setPhone(data.phone || '')
          setWhatsappOptIn(data.whatsappOptIn || false)
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...(data.notificationPreferences || {}),
          })
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error listening to notification prefs:', error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [userId])

  const savePreferences = useCallback(
    async (updates) => {
      if (!userId) return
      setSaving(true)
      try {
        const userRef = doc(db, 'users', userId)
        await updateDoc(userRef, {
          notificationPreferences: {
            ...preferences,
            ...updates,
          },
        })
        setPreferences((prev) => ({ ...prev, ...updates }))
      } finally {
        setSaving(false)
      }
    },
    [userId, preferences]
  )

  const savePhone = useCallback(
    async (newPhone) => {
      if (!userId) return
      setSaving(true)
      try {
        await updateDoc(doc(db, 'users', userId), { phone: newPhone })
        setPhone(newPhone)
      } finally {
        setSaving(false)
      }
    },
    [userId]
  )

  const toggleOptIn = useCallback(
    async (value) => {
      if (!userId) return
      setSaving(true)
      try {
        await updateDoc(doc(db, 'users', userId), { whatsappOptIn: value })
        setWhatsappOptIn(value)
      } finally {
        setSaving(false)
      }
    },
    [userId]
  )

  return {
    preferences,
    phone,
    whatsappOptIn,
    loading,
    saving,
    savePreferences,
    savePhone,
    toggleOptIn,
    DEFAULT_PREFERENCES,
  }
}
