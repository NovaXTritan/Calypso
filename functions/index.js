/**
 * Cosmos Cloud Functions
 *
 * Aggregates pod statistics to reduce client-side Firestore reads
 *
 * Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()
const db = admin.firestore()

// Collection names
const PODS_STATS = 'podStatsAggregated'
const GLOBAL_STATS = 'globalStats'

/**
 * Update pod stats when a proof is created
 */
exports.onProofCreated = functions.firestore
  .document('proofs/{proofId}')
  .onCreate(async (snap, context) => {
    const proof = snap.data()
    const podSlug = proof.podSlug

    if (!podSlug) return null

    const statsRef = db.collection(PODS_STATS).doc(podSlug)

    try {
      await db.runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(statsRef)

        if (statsDoc.exists) {
          transaction.update(statsRef, {
            totalProofs: admin.firestore.FieldValue.increment(1),
            weeklyProofs: admin.firestore.FieldValue.increment(1),
            lastProofAt: Date.now(),
            updatedAt: Date.now()
          })
        } else {
          transaction.set(statsRef, {
            podSlug,
            members: 0,
            totalProofs: 1,
            weeklyProofs: 1,
            lastProofAt: Date.now(),
            updatedAt: Date.now()
          })
        }
      })

      console.log(`Updated stats for pod: ${podSlug}`)
      return null
    } catch (error) {
      console.error(`Error updating pod stats for ${podSlug}:`, error)
      return null
    }
  })

/**
 * Update pod stats when a proof is deleted
 */
exports.onProofDeleted = functions.firestore
  .document('proofs/{proofId}')
  .onDelete(async (snap, context) => {
    const proof = snap.data()
    const podSlug = proof.podSlug

    if (!podSlug) return null

    const statsRef = db.collection(PODS_STATS).doc(podSlug)

    try {
      await statsRef.update({
        totalProofs: admin.firestore.FieldValue.increment(-1),
        updatedAt: Date.now()
      })

      return null
    } catch (error) {
      console.error(`Error updating pod stats on delete for ${podSlug}:`, error)
      return null
    }
  })

/**
 * Update member counts when user joins/leaves pods
 */
exports.onUserUpdated = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()

    const oldPods = new Set(before.joinedPods || [])
    const newPods = new Set(after.joinedPods || [])

    // Find pods that were joined
    const joinedPods = [...newPods].filter(p => !oldPods.has(p))

    // Find pods that were left
    const leftPods = [...oldPods].filter(p => !newPods.has(p))

    if (joinedPods.length === 0 && leftPods.length === 0) {
      return null
    }

    const batch = db.batch()

    // Increment member count for joined pods
    for (const podSlug of joinedPods) {
      const statsRef = db.collection(PODS_STATS).doc(podSlug)
      batch.set(statsRef, {
        podSlug,
        members: admin.firestore.FieldValue.increment(1),
        updatedAt: Date.now()
      }, { merge: true })
    }

    // Decrement member count for left pods
    for (const podSlug of leftPods) {
      const statsRef = db.collection(PODS_STATS).doc(podSlug)
      batch.update(statsRef, {
        members: admin.firestore.FieldValue.increment(-1),
        updatedAt: Date.now()
      })
    }

    try {
      await batch.commit()
      console.log(`Updated member counts: +${joinedPods.length} -${leftPods.length}`)
      return null
    } catch (error) {
      console.error('Error updating member counts:', error)
      return null
    }
  })

/**
 * Initialize member count when user is created
 */
exports.onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userData = snap.data()
    const joinedPods = userData.joinedPods || []

    if (joinedPods.length === 0) return null

    const batch = db.batch()

    for (const podSlug of joinedPods) {
      const statsRef = db.collection(PODS_STATS).doc(podSlug)
      batch.set(statsRef, {
        podSlug,
        members: admin.firestore.FieldValue.increment(1),
        updatedAt: Date.now()
      }, { merge: true })
    }

    try {
      await batch.commit()
      return null
    } catch (error) {
      console.error('Error initializing member counts:', error)
      return null
    }
  })

/**
 * Reset weekly proof counts (run via Cloud Scheduler every Monday)
 * Schedule: 0 0 * * 1 (every Monday at midnight UTC)
 */
exports.resetWeeklyStats = functions.pubsub
  .schedule('0 0 * * 1')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const statsSnapshot = await db.collection(PODS_STATS).get()
      const batch = db.batch()

      statsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { weeklyProofs: 0 })
      })

      await batch.commit()
      console.log('Reset weekly stats for all pods')
      return null
    } catch (error) {
      console.error('Error resetting weekly stats:', error)
      return null
    }
  })

/**
 * HTTP endpoint to initialize pod stats (one-time use)
 * Call via: curl https://us-central1-cosmos-e42b5.cloudfunctions.net/initPodStats
 */
exports.initPodStats = functions.https.onRequest(async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).send('Method not allowed')
    return
  }

  try {
    console.log('Starting pod stats initialization...')

    // Get all users
    const usersSnapshot = await db.collection('users').get()
    const memberCounts = {}

    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data()
      const joinedPods = userData.joinedPods || []
      joinedPods.forEach(podSlug => {
        memberCounts[podSlug] = (memberCounts[podSlug] || 0) + 1
      })
    })

    // Get all proofs
    const proofsSnapshot = await db.collection('proofs').get()
    const proofCounts = {}
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weeklyProofs = {}

    proofsSnapshot.docs.forEach(doc => {
      const proof = doc.data()
      const podSlug = proof.podSlug
      if (podSlug) {
        proofCounts[podSlug] = (proofCounts[podSlug] || 0) + 1

        // Handle different timestamp formats
        let createdAt = 0
        if (proof.createdAt) {
          if (typeof proof.createdAt.toMillis === 'function') {
            createdAt = proof.createdAt.toMillis()
          } else if (typeof proof.createdAt === 'number') {
            createdAt = proof.createdAt
          }
        }

        if (createdAt > weekAgo) {
          weeklyProofs[podSlug] = (weeklyProofs[podSlug] || 0) + 1
        }
      }
    })

    // Get all unique pod slugs
    const allPods = new Set([
      ...Object.keys(memberCounts),
      ...Object.keys(proofCounts)
    ])

    // Update stats for each pod
    const batch = db.batch()
    const results = []

    for (const podSlug of allPods) {
      const statsRef = db.collection(PODS_STATS).doc(podSlug)
      const stats = {
        podSlug,
        members: memberCounts[podSlug] || 0,
        totalProofs: proofCounts[podSlug] || 0,
        weeklyProofs: weeklyProofs[podSlug] || 0,
        updatedAt: Date.now(),
        initializedAt: Date.now()
      }
      batch.set(statsRef, stats)
      results.push(stats)
    }

    await batch.commit()

    console.log(`Initialized ${allPods.size} pod stats`)

    res.status(200).json({
      success: true,
      message: `Initialized ${allPods.size} pod stats`,
      podsUpdated: allPods.size,
      totalUsers: usersSnapshot.size,
      totalProofs: proofsSnapshot.size,
      stats: results
    })
  } catch (error) {
    console.error('Error initializing pod stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Manually recalculate all pod stats (callable function for admin use)
 * Call via: firebase functions:call recalculatePodStats
 */
exports.recalculatePodStats = functions.https.onCall(async (data, context) => {
  // Optional: Check if user is admin
  // if (!context.auth || !isAdmin(context.auth.uid)) {
  //   throw new functions.https.HttpsError('permission-denied', 'Must be admin')
  // }

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get()
    const memberCounts = {}

    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data()
      const joinedPods = userData.joinedPods || []
      joinedPods.forEach(podSlug => {
        memberCounts[podSlug] = (memberCounts[podSlug] || 0) + 1
      })
    })

    // Get all proofs
    const proofsSnapshot = await db.collection('proofs').get()
    const proofCounts = {}
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const weeklyProofs = {}

    proofsSnapshot.docs.forEach(doc => {
      const proof = doc.data()
      const podSlug = proof.podSlug
      if (podSlug) {
        proofCounts[podSlug] = (proofCounts[podSlug] || 0) + 1
        if (proof.createdAt >= weekAgo) {
          weeklyProofs[podSlug] = (weeklyProofs[podSlug] || 0) + 1
        }
      }
    })

    // Get all unique pod slugs
    const allPods = new Set([
      ...Object.keys(memberCounts),
      ...Object.keys(proofCounts)
    ])

    // Update stats for each pod
    const batch = db.batch()

    for (const podSlug of allPods) {
      const statsRef = db.collection(PODS_STATS).doc(podSlug)
      batch.set(statsRef, {
        podSlug,
        members: memberCounts[podSlug] || 0,
        totalProofs: proofCounts[podSlug] || 0,
        weeklyProofs: weeklyProofs[podSlug] || 0,
        updatedAt: Date.now(),
        recalculatedAt: Date.now()
      })
    }

    await batch.commit()

    return {
      success: true,
      podsUpdated: allPods.size,
      totalUsers: usersSnapshot.size,
      totalProofs: proofsSnapshot.size
    }
  } catch (error) {
    console.error('Error recalculating pod stats:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
