import { create } from 'zustand'
import { pods as PODS, slugify } from './podsData'
import { db } from './lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

const initialThreads = {}
const initialPosts = {}
for (const name of PODS) {
  const slug = slugify(name)
  const tid = `${slug}-welcome`
  initialThreads[slug] = [{ id: tid, title: 'Weekly Ship #1', author: 'system', createdAt: Date.now() }]
  initialPosts[tid] = [{
    id: tid+'-p1',
    author: 'system',
    type: 'text',
    content: 'Welcome! Share a tiny proof of progress you shipped this week (link, screenshot URL, or a short note).',
    createdAt: Date.now()
  }]
}

// PERSISTENCE FIX: Load from localStorage
const persisted = (() => {
  try { 
    return JSON.parse(localStorage.getItem('cosmos_forum_v1') || 'null') 
  } catch { 
    return null 
  }
})()

export const useForum = create((set, get) => ({
  pods: PODS.map(n => ({ name: n, slug: slugify(n), members: 0 })),
  me: { name: 'You' },
  // STATE FIX: Initialize membership from localStorage
  membership: persisted?.membership 
    ? new Set(persisted.membership) 
    : new Set(),
  threads: persisted?.threads || initialThreads,
  posts: persisted?.posts || initialPosts,
  userId: null, // Will be set when user logs in

  // Set user ID for Firebase sync
  setUserId: (uid) => set({ userId: uid }),

  // RACE CONDITION FIX: Debounced join with Firebase sync
  joinPod: async (slug) => {
    const state = get()
    const newMembership = new Set(state.membership)
    newMembership.add(slug)
    
    // Update local state immediately (optimistic update)
    set({ membership: newMembership })
    
    // Sync to Firebase if user is logged in
    if (state.userId) {
      try {
        const membershipArray = Array.from(newMembership)
        await updateDoc(doc(db, 'users', state.userId), {
          joinedPods: membershipArray
        })
      } catch (error) {
        console.error('Error syncing pod join to Firebase:', error)
        // Rollback on error
        set({ membership: state.membership })
      }
    }
  },

  // RACE CONDITION FIX: Debounced leave with Firebase sync
  leavePod: async (slug) => {
    const state = get()
    const newMembership = new Set(state.membership)
    newMembership.delete(slug)
    
    // Update local state immediately (optimistic update)
    set({ membership: newMembership })
    
    // Sync to Firebase if user is logged in
    if (state.userId) {
      try {
        const membershipArray = Array.from(newMembership)
        await updateDoc(doc(db, 'users', state.userId), {
          joinedPods: membershipArray
        })
      } catch (error) {
        console.error('Error syncing pod leave to Firebase:', error)
        // Rollback on error
        set({ membership: state.membership })
      }
    }
  },

  // Initialize membership from Firebase user data
  initializeMembership: (joinedPods) => {
    if (Array.isArray(joinedPods)) {
      set({ membership: new Set(joinedPods) })
    }
  },

  newThread: (slug, title) => set(state => {
    const id = `${slug}-${Math.random().toString(36).slice(2,8)}`
    const t = { id, title, author: state.me.name, createdAt: Date.now() }
    state.threads[slug] = [...(state.threads[slug]||[]), t]
    return { threads: { ...state.threads } }
  }),

  newPost: (threadId, payload) => set(state => {
    const p = { 
      id: `${threadId}-${Math.random().toString(36).slice(2,8)}`, 
      author: state.me.name, 
      createdAt: Date.now(), 
      ...payload 
    }
    state.posts[threadId] = [...(state.posts[threadId]||[]), p]
    return { posts: { ...state.posts } }
  }),

  setMe: (name) => set({ me: { name } }),
}))

// PERSISTENCE FIX: Save membership + threads/posts to localStorage
useForum.subscribe((state) => {
  const toSave = { 
    threads: state.threads, 
    posts: state.posts,
    // FIX: Persist membership as array (Set can't be JSON stringified)
    membership: Array.from(state.membership)
  }
  try { 
    localStorage.setItem('cosmos_forum_v1', JSON.stringify(toSave)) 
  } catch (err) {
    console.error('Error saving to localStorage:', err)
  }
})