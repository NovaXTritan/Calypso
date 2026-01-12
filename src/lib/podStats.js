// src/lib/podStats.js - Denormalized pod statistics for O(1) lookups
import { db } from './firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  getDocs,
  query,
  limit,
  startAfter,
  writeBatch
} from 'firebase/firestore'
import { firestoreOperation, withRetry, isRetryableError } from '../utils/retry'

const STATS_COLLECTION = 'podStats'
const BATCH_SIZE = 500 // Firestore batch write limit

/**
 * Get member count for a specific pod
 * Falls back to 0 if stats don't exist
 */
export async function getPodMemberCount(podSlug) {
  try {
    return await firestoreOperation(async () => {
      const statsRef = doc(db, STATS_COLLECTION, podSlug)
      const statsDoc = await getDoc(statsRef)

      if (statsDoc.exists()) {
        return statsDoc.data().memberCount || 0
      }
      return 0
    }, { operation: `Get member count for ${podSlug}` })
  } catch (error) {
    console.error('Error getting pod member count:', error)
    return 0
  }
}

/**
 * Get stats for multiple pods at once
 * Returns object: { [podSlug]: { memberCount, proofsThisWeek, activeToday } }
 */
export async function getAllPodStats() {
  try {
    return await firestoreOperation(async () => {
      const statsSnapshot = await getDocs(collection(db, STATS_COLLECTION))
      const stats = {}

      statsSnapshot.docs.forEach(doc => {
        stats[doc.id] = doc.data()
      })

      return stats
    }, { operation: 'Get all pod stats' })
  } catch (error) {
    console.error('Error getting all pod stats:', error)
    return {}
  }
}

/**
 * Increment member count when user joins a pod
 * Creates the stats doc if it doesn't exist
 * Uses retry logic for resilience
 */
export async function incrementMemberCount(podSlug) {
  try {
    await withRetry(async () => {
      const statsRef = doc(db, STATS_COLLECTION, podSlug)
      const statsDoc = await getDoc(statsRef)

      if (statsDoc.exists()) {
        await updateDoc(statsRef, {
          memberCount: increment(1),
          lastUpdated: Date.now()
        })
      } else {
        // Create new stats document
        await setDoc(statsRef, {
          memberCount: 1,
          proofsThisWeek: 0,
          activeToday: 0,
          totalProofs: 0,
          createdAt: Date.now(),
          lastUpdated: Date.now()
        })
      }
    }, {
      maxAttempts: 3,
      shouldRetry: isRetryableError
    })
  } catch (error) {
    console.error('Error incrementing member count:', error)
    // Don't throw - this is a best-effort update
  }
}

/**
 * Decrement member count when user leaves a pod
 * Uses retry logic for resilience
 */
export async function decrementMemberCount(podSlug) {
  try {
    await withRetry(async () => {
      const statsRef = doc(db, STATS_COLLECTION, podSlug)
      const statsDoc = await getDoc(statsRef)

      if (statsDoc.exists()) {
        const currentCount = statsDoc.data().memberCount || 0
        // Ensure we don't go negative
        await updateDoc(statsRef, {
          memberCount: currentCount > 0 ? increment(-1) : 0,
          lastUpdated: Date.now()
        })
      }
    }, {
      maxAttempts: 3,
      shouldRetry: isRetryableError
    })
  } catch (error) {
    console.error('Error decrementing member count:', error)
    // Don't throw - this is a best-effort update
  }
}

/**
 * Increment total proofs count for a pod
 * Called when a new proof is created
 */
export async function incrementProofCount(podSlug) {
  try {
    await withRetry(async () => {
      const statsRef = doc(db, STATS_COLLECTION, podSlug)
      const statsDoc = await getDoc(statsRef)

      if (statsDoc.exists()) {
        await updateDoc(statsRef, {
          totalProofs: increment(1),
          lastUpdated: Date.now()
        })
      } else {
        await setDoc(statsRef, {
          memberCount: 0,
          proofsThisWeek: 0,
          activeToday: 0,
          totalProofs: 1,
          createdAt: Date.now(),
          lastUpdated: Date.now()
        })
      }
    }, {
      maxAttempts: 3,
      shouldRetry: isRetryableError
    })
  } catch (error) {
    console.error('Error incrementing proof count:', error)
  }
}

/**
 * Initialize pod stats from existing user data
 * Run this once to backfill stats for existing pods
 * This is an admin/migration function
 *
 * Uses cursor-based pagination to handle large user bases
 */
export async function initializePodStats(onProgress = null) {
  try {
    const memberCounts = {}
    let lastDoc = null
    let totalProcessed = 0

    // Paginate through users to avoid memory issues
    while (true) {
      let usersQuery = query(
        collection(db, 'users'),
        limit(BATCH_SIZE)
      )

      if (lastDoc) {
        usersQuery = query(
          collection(db, 'users'),
          startAfter(lastDoc),
          limit(BATCH_SIZE)
        )
      }

      const usersSnapshot = await firestoreOperation(
        () => getDocs(usersQuery),
        { operation: 'Fetch users batch for stats init' }
      )

      if (usersSnapshot.empty) break

      // Count members per pod
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data()
        const joinedPods = userData.joinedPods || []
        joinedPods.forEach(podSlug => {
          memberCounts[podSlug] = (memberCounts[podSlug] || 0) + 1
        })
      })

      totalProcessed += usersSnapshot.docs.length
      lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1]

      // Report progress
      if (onProgress) {
        onProgress({ processed: totalProcessed, pods: Object.keys(memberCounts).length })
      }

      // If we got fewer than BATCH_SIZE, we're done
      if (usersSnapshot.docs.length < BATCH_SIZE) break
    }

    // Use batched writes for efficiency
    const podEntries = Object.entries(memberCounts)
    for (let i = 0; i < podEntries.length; i += BATCH_SIZE) {
      const batch = writeBatch(db)
      const batchEntries = podEntries.slice(i, i + BATCH_SIZE)

      for (const [podSlug, count] of batchEntries) {
        const statsRef = doc(db, STATS_COLLECTION, podSlug)
        batch.set(statsRef, {
          memberCount: count,
          proofsThisWeek: 0,
          activeToday: 0,
          totalProofs: 0,
          createdAt: Date.now(),
          lastUpdated: Date.now()
        }, { merge: true })
      }

      await firestoreOperation(
        () => batch.commit(),
        { operation: `Write pod stats batch ${i / BATCH_SIZE + 1}` }
      )
    }

    return memberCounts
  } catch (error) {
    console.error('Error initializing pod stats:', error)
    throw error
  }
}
