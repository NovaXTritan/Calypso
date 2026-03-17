/**
 * useInsights — Real-time Firestore listener for the latest AI insight
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
} from 'firebase/firestore'

const functions = getFunctions()
const analyzeOnDemandFn = httpsCallable(functions, 'analyzeJournalOnDemand')

export default function useInsights(userId) {
  const [latestInsight, setLatestInsight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  // Real-time listener for latest insight
  useEffect(() => {
    if (!userId) return

    const insightsRef = collection(db, 'users', userId, 'insights')
    const q = query(insightsRef, orderBy('generatedAt', 'desc'), limit(1))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        setLatestInsight({ id: doc.id, ...doc.data() })
      } else {
        setLatestInsight(null)
      }
      setLoading(false)
    }, (err) => {
      console.error('Error loading insights:', err)
      setLoading(false)
    })

    return unsubscribe
  }, [userId])

  // Trigger on-demand analysis
  const analyzeNow = useCallback(async () => {
    if (analyzing) return

    setAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeOnDemandFn()
      return result.data
    } catch (err) {
      const errorMessage =
        err.code === 'functions/resource-exhausted'
          ? err.message
          : err.code === 'functions/failed-precondition'
          ? err.message
          : 'Failed to generate analysis. Please try again.'
      setError(errorMessage)
      throw err
    } finally {
      setAnalyzing(false)
    }
  }, [analyzing])

  return {
    latestInsight,
    loading,
    analyzing,
    error,
    analyzeNow,
  }
}
