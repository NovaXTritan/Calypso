// accountability.js - Accountability Partner matching and management
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from './firebase'

// Calculate compatibility score between two users
function calculateCompatibility(user1, user2) {
  let score = 0

  // Same pods (40% weight)
  const user1Pods = user1.joinedPods || []
  const user2Pods = user2.joinedPods || []
  const commonPods = user1Pods.filter(p => user2Pods.includes(p))
  const podScore = commonPods.length / Math.max(user1Pods.length, user2Pods.length, 1)
  score += podScore * 40

  // Similar goals (30% weight)
  const user1Goals = (user1.goals || []).map(g => g.toLowerCase())
  const user2Goals = (user2.goals || []).map(g => g.toLowerCase())
  let goalMatches = 0
  user1Goals.forEach(g1 => {
    user2Goals.forEach(g2 => {
      if (g1.includes(g2) || g2.includes(g1) || levenshteinSimilarity(g1, g2) > 0.6) {
        goalMatches++
      }
    })
  })
  const goalScore = goalMatches / Math.max(user1Goals.length, user2Goals.length, 1)
  score += Math.min(goalScore, 1) * 30

  // Activity level match (20% weight) - prefer similar activity
  const user1Activity = user1.totalProofs || 0
  const user2Activity = user2.totalProofs || 0
  const activityDiff = Math.abs(user1Activity - user2Activity)
  const maxActivity = Math.max(user1Activity, user2Activity, 1)
  const activityScore = 1 - (activityDiff / maxActivity)
  score += activityScore * 20

  // Streak similarity (10% weight)
  const user1Streak = user1.streak || 0
  const user2Streak = user2.streak || 0
  const streakDiff = Math.abs(user1Streak - user2Streak)
  const streakScore = Math.max(0, 1 - (streakDiff / 10))
  score += streakScore * 10

  return {
    score: Math.round(score),
    commonPods,
    reasons: generateMatchReasons(commonPods, goalMatches, user1, user2)
  }
}

// Levenshtein similarity for fuzzy goal matching
function levenshteinSimilarity(s1, s2) {
  if (s1 === s2) return 1
  if (!s1 || !s2) return 0

  const longer = s1.length > s2.length ? s1 : s2
  const shorter = s1.length > s2.length ? s2 : s1

  if (longer.length === 0) return 1

  const costs = []
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[s2.length] = lastValue
  }

  return (longer.length - costs[s2.length]) / longer.length
}

// Generate human-readable match reasons
function generateMatchReasons(commonPods, goalMatches, user1, user2) {
  const reasons = []

  if (commonPods.length > 0) {
    reasons.push(`Both learning in ${commonPods.slice(0, 2).join(' & ')}`)
  }

  if (goalMatches > 0) {
    reasons.push('Similar learning goals')
  }

  const streakDiff = Math.abs((user1.streak || 0) - (user2.streak || 0))
  if (streakDiff <= 3) {
    reasons.push('Similar consistency level')
  }

  return reasons.slice(0, 3)
}

// Find best accountability partner for a user in a specific pod
export async function findAccountabilityPartner(userId, podSlug) {
  try {
    // Get current user
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return null

    const currentUser = { id: userId, ...userDoc.data() }

    // Check if user has opted out
    if (currentUser.privacySettings?.hideFromMatching) {
      return null
    }

    // Check existing partnership
    const existingPartner = await getExistingPartner(userId, podSlug)
    if (existingPartner) {
      return existingPartner
    }

    // Get users in this pod only (OPTIMIZED: uses array-contains + limit)
    const usersQuery = query(
      collection(db, 'users'),
      where('joinedPods', 'array-contains', podSlug),
      limit(50)
    )
    const usersSnapshot = await getDocs(usersQuery)
    const potentialPartners = []

    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data()

      // Skip self
      if (doc.id === userId) return

      // Skip users who opted out
      if (userData.privacySettings?.hideFromMatching) return

      // Skip users who already have a partner in this pod
      const existingPartnership = (userData.accountabilityPartners || [])
        .find(p => p.podSlug === podSlug && p.status === 'active')
      if (existingPartnership) return

      const compatibility = calculateCompatibility(currentUser, { id: doc.id, ...userData })

      potentialPartners.push({
        id: doc.id,
        ...userData,
        compatibility
      })
    })

    // Sort by compatibility score
    potentialPartners.sort((a, b) => b.compatibility.score - a.compatibility.score)

    // Return top match
    return potentialPartners[0] || null
  } catch (error) {
    console.error('Error finding accountability partner:', error)
    return null
  }
}

// Get existing partner for a pod
export async function getExistingPartner(userId, podSlug) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (!userDoc.exists()) return null

    const userData = userDoc.data()
    const partnerships = userData.accountabilityPartners || []

    const activePartnership = partnerships.find(
      p => p.podSlug === podSlug && p.status === 'active'
    )

    if (!activePartnership) return null

    // Fetch partner details
    const partnerDoc = await getDoc(doc(db, 'users', activePartnership.partnerId))
    if (!partnerDoc.exists()) return null

    return {
      id: partnerDoc.id,
      ...partnerDoc.data(),
      partnershipId: activePartnership.id,
      since: activePartnership.createdAt
    }
  } catch (error) {
    console.error('Error getting existing partner:', error)
    return null
  }
}

// Request accountability partnership
export async function requestPartnership(userId, partnerId, podSlug) {
  try {
    const partnershipId = `${userId}_${partnerId}_${podSlug}`

    // Create partnership request
    await setDoc(doc(db, 'partnershipRequests', partnershipId), {
      fromUserId: userId,
      toUserId: partnerId,
      podSlug,
      status: 'pending',
      createdAt: serverTimestamp()
    })

    // Create notification for the partner
    await setDoc(doc(collection(db, 'notifications')), {
      userId: partnerId,
      type: 'partnership_request',
      fromUserId: userId,
      podSlug,
      message: 'Someone wants to be your accountability partner!',
      read: false,
      createdAt: serverTimestamp()
    })

    return { success: true, partnershipId }
  } catch (error) {
    console.error('Error requesting partnership:', error)
    return { success: false, error }
  }
}

// Accept partnership request
export async function acceptPartnership(userId, fromUserId, podSlug) {
  try {
    const partnershipId = `${fromUserId}_${userId}_${podSlug}`

    // Update request status
    await updateDoc(doc(db, 'partnershipRequests', partnershipId), {
      status: 'accepted',
      acceptedAt: serverTimestamp()
    })

    // Add to both users' accountabilityPartners array
    const partnershipData = {
      id: partnershipId,
      podSlug,
      status: 'active',
      createdAt: Date.now()
    }

    await updateDoc(doc(db, 'users', userId), {
      accountabilityPartners: arrayUnion({
        ...partnershipData,
        partnerId: fromUserId
      })
    })

    await updateDoc(doc(db, 'users', fromUserId), {
      accountabilityPartners: arrayUnion({
        ...partnershipData,
        partnerId: userId
      })
    })

    // Notify the requester
    await setDoc(doc(collection(db, 'notifications')), {
      userId: fromUserId,
      type: 'partnership_accepted',
      fromUserId: userId,
      podSlug,
      message: 'Your accountability partner request was accepted!',
      read: false,
      createdAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error accepting partnership:', error)
    return { success: false, error }
  }
}

// End partnership
export async function endPartnership(userId, partnerId, podSlug) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    const partnerDoc = await getDoc(doc(db, 'users', partnerId))

    if (userDoc.exists()) {
      const userData = userDoc.data()
      const updatedPartnerships = (userData.accountabilityPartners || [])
        .filter(p => !(p.partnerId === partnerId && p.podSlug === podSlug))

      await updateDoc(doc(db, 'users', userId), {
        accountabilityPartners: updatedPartnerships
      })
    }

    if (partnerDoc.exists()) {
      const partnerData = partnerDoc.data()
      const updatedPartnerships = (partnerData.accountabilityPartners || [])
        .filter(p => !(p.partnerId === userId && p.podSlug === podSlug))

      await updateDoc(doc(db, 'users', partnerId), {
        accountabilityPartners: updatedPartnerships
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error ending partnership:', error)
    return { success: false, error }
  }
}

// Check if partner posted today and send nudge if not
export async function checkPartnerActivity(userId, partnerId, podSlug) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    // Check partner's last proof in this pod
    const proofsQuery = query(
      collection(db, 'proofs'),
      where('authorId', '==', partnerId),
      where('podSlug', '==', podSlug),
      orderBy('createdAt', 'desc'),
      limit(1)
    )

    const proofsSnapshot = await getDocs(proofsQuery)

    if (proofsSnapshot.empty) {
      return { postedToday: false, lastPosted: null }
    }

    const lastProof = proofsSnapshot.docs[0].data()
    const postedToday = lastProof.createdAt >= todayTimestamp

    return {
      postedToday,
      lastPosted: lastProof.createdAt
    }
  } catch (error) {
    console.error('Error checking partner activity:', error)
    return { postedToday: false, lastPosted: null }
  }
}

// Send nudge to partner
export async function sendNudge(fromUserId, toUserId, podSlug) {
  try {
    const fromUserDoc = await getDoc(doc(db, 'users', fromUserId))
    const fromUserName = fromUserDoc.exists()
      ? (fromUserDoc.data().displayName || 'Your partner')
      : 'Your partner'

    await setDoc(doc(collection(db, 'notifications')), {
      userId: toUserId,
      type: 'partner_nudge',
      fromUserId,
      podSlug,
      message: `${fromUserName} is waiting for your daily proof! Don't break your streak 🔥`,
      read: false,
      createdAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending nudge:', error)
    return { success: false, error }
  }
}
