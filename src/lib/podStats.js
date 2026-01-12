// src/lib/podStats.js - Denormalized pod statistics for O(1) lookups
import { db } from './firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  getDocs
} from 'firebase/firestore'

const STATS_COLLECTION = 'podStats'

/**
 * Get member count for a specific pod
 * Falls back to 0 if stats don't exist
 */
export async function getPodMemberCount(podSlug) {
  try {
    const statsRef = doc(db, STATS_COLLECTION, podSlug)
    const statsDoc = await getDoc(statsRef)

    if (statsDoc.exists()) {
      return statsDoc.data().memberCount || 0
    }
    return 0
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
    const statsSnapshot = await getDocs(collection(db, STATS_COLLECTION))
    const stats = {}

    statsSnapshot.docs.forEach(doc => {
      stats[doc.id] = doc.data()
    })

    return stats
  } catch (error) {
    console.error('Error getting all pod stats:', error)
    return {}
  }
}

/**
 * Increment member count when user joins a pod
 * Creates the stats doc if it doesn't exist
 */
export async function incrementMemberCount(podSlug) {
  try {
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
        createdAt: Date.now(),
        lastUpdated: Date.now()
      })
    }
  } catch (error) {
    console.error('Error incrementing member count:', error)
    // Don't throw - this is a best-effort update
  }
}

/**
 * Decrement member count when user leaves a pod
 */
export async function decrementMemberCount(podSlug) {
  try {
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
  } catch (error) {
    console.error('Error decrementing member count:', error)
    // Don't throw - this is a best-effort update
  }
}

/**
 * Initialize pod stats from existing user data
 * Run this once to backfill stats for existing pods
 * This is an admin/migration function
 */
export async function initializePodStats() {
  try {
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'))
    const memberCounts = {}

    // Count members per pod
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data()
      const joinedPods = userData.joinedPods || []
      joinedPods.forEach(podSlug => {
        memberCounts[podSlug] = (memberCounts[podSlug] || 0) + 1
      })
    })

    // Write stats for each pod
    for (const [podSlug, count] of Object.entries(memberCounts)) {
      const statsRef = doc(db, STATS_COLLECTION, podSlug)
      await setDoc(statsRef, {
        memberCount: count,
        proofsThisWeek: 0,
        activeToday: 0,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      }, { merge: true })
    }

    return memberCounts
  } catch (error) {
    console.error('Error initializing pod stats:', error)
    throw error
  }
}
