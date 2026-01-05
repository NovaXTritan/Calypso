import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update display name in Firebase Auth
    await updateProfile(userCredential.user, { displayName })
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: email,
      displayName: displayName,
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
    updateUserProfile,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
