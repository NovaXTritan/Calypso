import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { useForum } from '../storeForum'

const AuthContext = createContext({})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Signup function
  async function signup(email, password, displayName) {
    // Normalize email to lowercase for consistency
    const normalizedEmail = email.trim().toLowerCase()
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password)

    // Update display name in Firebase Auth
    await updateProfile(userCredential.user, { displayName: displayName.trim() })

    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: normalizedEmail,
      displayName: displayName.trim(),
      photoURL: null,
      bio: '',
      goals: [],
      joinedPods: [], // Initialize empty pod membership
      createdAt: Date.now(),
      streak: 0,
      totalProofs: 0,
      preferences: {
        theme: 'dark',
        emailNotifications: true,
        publicProfile: true
      }
    })
    
    return userCredential
  }

  // Login function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  // Logout function
  function logout() {
    // Clear forum state on logout
    const { setUserId, initializeMembership } = useForum.getState()
    setUserId(null)
    initializeMembership([])

    // Clear localStorage to prevent data leakage on shared devices
    try {
      localStorage.removeItem('cosmos_forum_v1')
    } catch (e) {
      // Ignore localStorage errors
    }

    return signOut(auth)
  }

  // Update user email
  function changeEmail(newEmail) {
    return updateEmail(auth.currentUser, newEmail)
  }

  // Update user password
  function changePassword(newPassword) {
    return updatePassword(auth.currentUser, newPassword)
  }

  // Reset password via email
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
  }

  // Update user profile in Firestore
  async function updateUserProfile(updates) {
    if (!currentUser) return
    
    await updateDoc(doc(db, 'users', currentUser.uid), updates)
    
    // Refresh current user data
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
    const updatedUser = {
      ...auth.currentUser,
      ...userDoc.data()
    }
    setCurrentUser(updatedUser)
    
    // STATE FIX: Update forum membership if joinedPods changed
    if (updates.joinedPods) {
      const { initializeMembership } = useForum.getState()
      initializeMembership(updates.joinedPods)
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setCurrentUser({
            ...user,
            ...userData
          })
          
          // STATE FIX: Initialize forum state with user data
          const { setUserId, initializeMembership, setMe } = useForum.getState()
          setUserId(user.uid)
          setMe(userData.displayName || 'You')
          initializeMembership(userData.joinedPods || [])
        } else {
          setCurrentUser(user)
          
          // Initialize with empty state
          const { setUserId, setMe } = useForum.getState()
          setUserId(user.uid)
          setMe(user.displayName || 'You')
        }
      } else {
        setCurrentUser(null)
        
        // Clear forum state on logout
        const { setUserId, initializeMembership } = useForum.getState()
        setUserId(null)
        initializeMembership([])
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    currentUser,
    signup,
    login,
    logout,
    changeEmail,
    changePassword,
    resetPassword,
    updateUserProfile,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
