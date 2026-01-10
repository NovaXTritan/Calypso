// coworking.js - Live Co-working Rooms system
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore'
import { db } from './firebase'

// Room types
export const ROOM_TYPES = {
  FOCUS: {
    label: 'Deep Focus',
    icon: '🎯',
    description: 'Quiet work, minimal chat',
    color: 'blue'
  },
  STUDY: {
    label: 'Study Session',
    icon: '📚',
    description: 'Learning & note-taking',
    color: 'purple'
  },
  ACCOUNTABILITY: {
    label: 'Accountability Hour',
    icon: '⏰',
    description: 'Timed work sprints',
    color: 'orange'
  },
  CASUAL: {
    label: 'Casual Co-work',
    icon: '☕',
    description: 'Relaxed atmosphere, open chat',
    color: 'green'
  }
}

// Session statuses
export const SESSION_STATUS = {
  WORKING: 'working',
  BREAK: 'break',
  AFK: 'afk'
}

// Create a new co-working room
export async function createRoom(userId, roomData) {
  try {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const room = {
      id: roomId,
      hostId: userId,
      title: roomData.title || 'Co-working Room',
      type: roomData.type || 'FOCUS',
      podSlug: roomData.podSlug || null,
      maxParticipants: roomData.maxParticipants || 10,
      isPrivate: roomData.isPrivate || false,
      password: roomData.password || null,
      participants: [],
      activeCount: 0,
      totalSessions: 0,
      status: 'active',
      createdAt: serverTimestamp(),
      endsAt: roomData.duration
        ? Date.now() + (roomData.duration * 60 * 1000)
        : null
    }

    await setDoc(doc(db, 'coworkingRooms', roomId), room)

    // Auto-join the host
    await joinRoom(roomId, userId, {
      displayName: roomData.hostName,
      photoURL: roomData.hostPhoto
    })

    return { success: true, roomId }
  } catch (error) {
    console.error('Error creating room:', error)
    return { success: false, error: error.message }
  }
}

// Join a co-working room
export async function joinRoom(roomId, userId, userData) {
  try {
    const roomRef = doc(db, 'coworkingRooms', roomId)
    const roomDoc = await getDoc(roomRef)

    if (!roomDoc.exists()) {
      return { success: false, error: 'Room not found' }
    }

    const room = roomDoc.data()

    // Check if room is full
    if (room.activeCount >= room.maxParticipants) {
      return { success: false, error: 'Room is full' }
    }

    // Check if room has ended
    if (room.endsAt && room.endsAt < Date.now()) {
      return { success: false, error: 'Room has ended' }
    }

    const participant = {
      id: userId,
      displayName: userData.displayName || 'Anonymous',
      photoURL: userData.photoURL || null,
      status: SESSION_STATUS.WORKING,
      joinedAt: Date.now(),
      focusTime: 0, // Minutes focused
      lastActive: Date.now()
    }

    // Update room
    await updateDoc(roomRef, {
      participants: arrayUnion(participant),
      activeCount: increment(1),
      totalSessions: increment(1)
    })

    // Create user session record
    await setDoc(doc(db, 'coworkingSessions', `${roomId}_${userId}`), {
      roomId,
      userId,
      joinedAt: serverTimestamp(),
      status: SESSION_STATUS.WORKING,
      focusTime: 0
    })

    return { success: true }
  } catch (error) {
    console.error('Error joining room:', error)
    return { success: false, error: error.message }
  }
}

// Leave a co-working room
export async function leaveRoom(roomId, userId) {
  try {
    const roomRef = doc(db, 'coworkingRooms', roomId)
    const roomDoc = await getDoc(roomRef)

    if (!roomDoc.exists()) {
      return { success: false, error: 'Room not found' }
    }

    const room = roomDoc.data()
    const participant = room.participants.find(p => p.id === userId)

    if (participant) {
      await updateDoc(roomRef, {
        participants: arrayRemove(participant),
        activeCount: increment(-1)
      })
    }

    // Update session record
    const sessionRef = doc(db, 'coworkingSessions', `${roomId}_${userId}`)
    const sessionDoc = await getDoc(sessionRef)

    if (sessionDoc.exists()) {
      const session = sessionDoc.data()
      const focusTime = Math.floor((Date.now() - session.joinedAt?.toDate?.()?.getTime() || 0) / 60000)

      await updateDoc(sessionRef, {
        leftAt: serverTimestamp(),
        focusTime
      })

      // Update user's total focus time
      await updateDoc(doc(db, 'users', userId), {
        totalFocusTime: increment(focusTime)
      })
    }

    // If host leaves and room is empty, close the room
    if (room.hostId === userId && room.activeCount <= 1) {
      await updateDoc(roomRef, {
        status: 'closed',
        closedAt: serverTimestamp()
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Error leaving room:', error)
    return { success: false, error: error.message }
  }
}

// Update participant status (working, break, afk)
export async function updateStatus(roomId, userId, newStatus) {
  try {
    const roomRef = doc(db, 'coworkingRooms', roomId)
    const roomDoc = await getDoc(roomRef)

    if (!roomDoc.exists()) {
      return { success: false, error: 'Room not found' }
    }

    const room = roomDoc.data()
    const participantIndex = room.participants.findIndex(p => p.id === userId)

    if (participantIndex === -1) {
      return { success: false, error: 'Not in this room' }
    }

    // Update the participant
    const updatedParticipants = [...room.participants]
    updatedParticipants[participantIndex] = {
      ...updatedParticipants[participantIndex],
      status: newStatus,
      lastActive: Date.now()
    }

    await updateDoc(roomRef, {
      participants: updatedParticipants
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating status:', error)
    return { success: false, error: error.message }
  }
}

// Send a message in the room chat
export async function sendRoomMessage(roomId, userId, message, userData) {
  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await setDoc(doc(db, 'coworkingRooms', roomId, 'messages', messageId), {
      id: messageId,
      authorId: userId,
      authorName: userData.displayName || 'Anonymous',
      authorPhoto: userData.photoURL || null,
      content: message.trim().substring(0, 500), // Limit message length
      type: 'text',
      createdAt: serverTimestamp()
    })

    return { success: true, messageId }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error: error.message }
  }
}

// Get active rooms (for browsing)
export function subscribeToRooms(podSlug, callback) {
  let roomsQuery

  if (podSlug) {
    roomsQuery = query(
      collection(db, 'coworkingRooms'),
      where('podSlug', '==', podSlug),
      where('status', '==', 'active'),
      where('isPrivate', '==', false),
      orderBy('activeCount', 'desc')
    )
  } else {
    roomsQuery = query(
      collection(db, 'coworkingRooms'),
      where('status', '==', 'active'),
      where('isPrivate', '==', false),
      orderBy('activeCount', 'desc')
    )
  }

  return onSnapshot(roomsQuery, (snapshot) => {
    const rooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(rooms)
  })
}

// Subscribe to a single room (for participants)
export function subscribeToRoom(roomId, callback) {
  return onSnapshot(doc(db, 'coworkingRooms', roomId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() })
    } else {
      callback(null)
    }
  })
}

// Subscribe to room messages
export function subscribeToRoomMessages(roomId, callback) {
  const messagesQuery = query(
    collection(db, 'coworkingRooms', roomId, 'messages'),
    orderBy('createdAt', 'asc')
  )

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    callback(messages)
  })
}

// Heartbeat to keep session alive
export async function sendHeartbeat(roomId, userId) {
  try {
    const roomRef = doc(db, 'coworkingRooms', roomId)
    const roomDoc = await getDoc(roomRef)

    if (!roomDoc.exists()) return

    const room = roomDoc.data()
    const participantIndex = room.participants.findIndex(p => p.id === userId)

    if (participantIndex === -1) return

    const updatedParticipants = [...room.participants]
    updatedParticipants[participantIndex] = {
      ...updatedParticipants[participantIndex],
      lastActive: Date.now()
    }

    await updateDoc(roomRef, {
      participants: updatedParticipants
    })
  } catch (error) {
    console.error('Error sending heartbeat:', error)
  }
}
