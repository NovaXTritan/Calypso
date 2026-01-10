// verification.js - Proof Verification system
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp,
  collection,
  setDoc
} from 'firebase/firestore'
import { db } from './firebase'

// Verification levels based on number of verifications
export const VERIFICATION_LEVELS = {
  UNVERIFIED: { min: 0, label: 'Unverified', color: 'zinc', icon: '○' },
  RISING: { min: 1, label: 'Rising', color: 'blue', icon: '◐' },
  VERIFIED: { min: 3, label: 'Verified', color: 'green', icon: '●' },
  TRUSTED: { min: 5, label: 'Trusted', color: 'glow', icon: '★' }
}

// Get verification level for a proof
export function getVerificationLevel(verificationCount) {
  const count = verificationCount || 0

  if (count >= VERIFICATION_LEVELS.TRUSTED.min) return VERIFICATION_LEVELS.TRUSTED
  if (count >= VERIFICATION_LEVELS.VERIFIED.min) return VERIFICATION_LEVELS.VERIFIED
  if (count >= VERIFICATION_LEVELS.RISING.min) return VERIFICATION_LEVELS.RISING
  return VERIFICATION_LEVELS.UNVERIFIED
}

// Verify a proof (add verification)
export async function verifyProof(proofId, userId, userDisplayName) {
  try {
    const proofRef = doc(db, 'proofs', proofId)
    const proofDoc = await getDoc(proofRef)

    if (!proofDoc.exists()) {
      return { success: false, error: 'Proof not found' }
    }

    const proofData = proofDoc.data()

    // Can't verify own proof
    if (proofData.authorId === userId) {
      return { success: false, error: 'Cannot verify your own proof' }
    }

    // Check if already verified
    const verifications = proofData.verifications || []
    const alreadyVerified = verifications.some(v => v.userId === userId)

    if (alreadyVerified) {
      return { success: false, error: 'Already verified' }
    }

    // Add verification
    const verification = {
      userId,
      userName: userDisplayName || 'Anonymous',
      verifiedAt: Date.now()
    }

    await updateDoc(proofRef, {
      verifications: arrayUnion(verification),
      verificationCount: increment(1)
    })

    // Award badge to author if this is their first verified proof
    const authorRef = doc(db, 'users', proofData.authorId)
    const authorDoc = await getDoc(authorRef)

    if (authorDoc.exists()) {
      const authorData = authorDoc.data()
      const newCount = (proofData.verificationCount || 0) + 1

      // Check for badge milestones
      if (newCount === 3) {
        // First verified proof badge
        await awardBadge(proofData.authorId, 'first_verified', 'First Verified Proof', 'Your proof was verified by 3 community members!')
      }

      // Notify the author
      await setDoc(doc(collection(db, 'notifications')), {
        userId: proofData.authorId,
        type: 'proof_verified',
        fromUserId: userId,
        proofId,
        message: `${userDisplayName || 'Someone'} verified your proof!`,
        read: false,
        createdAt: serverTimestamp()
      })
    }

    // Award reputation to verifier for contributing
    await updateDoc(doc(db, 'users', userId), {
      verificationsGiven: increment(1)
    })

    return { success: true, newCount: (proofData.verificationCount || 0) + 1 }
  } catch (error) {
    console.error('Error verifying proof:', error)
    return { success: false, error: error.message }
  }
}

// Remove verification (unverify)
export async function unverifyProof(proofId, userId) {
  try {
    const proofRef = doc(db, 'proofs', proofId)
    const proofDoc = await getDoc(proofRef)

    if (!proofDoc.exists()) {
      return { success: false, error: 'Proof not found' }
    }

    const proofData = proofDoc.data()
    const verifications = proofData.verifications || []
    const userVerification = verifications.find(v => v.userId === userId)

    if (!userVerification) {
      return { success: false, error: 'Not verified by you' }
    }

    await updateDoc(proofRef, {
      verifications: arrayRemove(userVerification),
      verificationCount: increment(-1)
    })

    return { success: true, newCount: Math.max(0, (proofData.verificationCount || 0) - 1) }
  } catch (error) {
    console.error('Error unverifying proof:', error)
    return { success: false, error: error.message }
  }
}

// Award badge to user
async function awardBadge(userId, badgeId, badgeName, badgeDescription) {
  try {
    const userRef = doc(db, 'users', userId)

    const badge = {
      id: badgeId,
      name: badgeName,
      description: badgeDescription,
      awardedAt: Date.now()
    }

    await updateDoc(userRef, {
      badges: arrayUnion(badge)
    })

    // Notify user
    await setDoc(doc(collection(db, 'notifications')), {
      userId,
      type: 'badge_earned',
      badge,
      message: `You earned a badge: ${badgeName}!`,
      read: false,
      createdAt: serverTimestamp()
    })

    return { success: true }
  } catch (error) {
    console.error('Error awarding badge:', error)
    return { success: false, error: error.message }
  }
}

// Get user's verification stats
export async function getVerificationStats(userId) {
  try {
    const userRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      return { given: 0, received: 0 }
    }

    const userData = userDoc.data()

    return {
      given: userData.verificationsGiven || 0,
      received: userData.verificationsReceived || 0,
      badges: userData.badges || []
    }
  } catch (error) {
    console.error('Error getting verification stats:', error)
    return { given: 0, received: 0, badges: [] }
  }
}

// Check if proof can be verified by user
export function canVerify(proof, userId) {
  if (!proof || !userId) return false
  if (proof.authorId === userId) return false

  const verifications = proof.verifications || []
  return !verifications.some(v => v.userId === userId)
}

// Check if proof is verified by user
export function isVerifiedByUser(proof, userId) {
  if (!proof || !userId) return false

  const verifications = proof.verifications || []
  return verifications.some(v => v.userId === userId)
}
