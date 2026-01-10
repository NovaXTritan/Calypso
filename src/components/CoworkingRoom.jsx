// CoworkingRoom.jsx - Live Co-working Rooms widget
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ROOM_TYPES,
  SESSION_STATUS,
  createRoom,
  joinRoom,
  leaveRoom,
  updateStatus,
  subscribeToRooms,
  subscribeToRoom,
  subscribeToRoomMessages,
  sendRoomMessage,
  sendHeartbeat
} from '../lib/coworking'
import {
  Users,
  Plus,
  Coffee,
  Play,
  Pause,
  LogOut,
  Send,
  Clock,
  X,
  ChevronDown
} from 'lucide-react'

// Status indicator colors
const STATUS_COLORS = {
  working: 'bg-green-500',
  break: 'bg-yellow-500',
  afk: 'bg-zinc-500'
}

export default function CoworkingRoom({ userId, userEmail, userName, userPhoto, podSlug, podName }) {
  const [rooms, setRooms] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRoomView, setShowRoomView] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [myStatus, setMyStatus] = useState(SESSION_STATUS.WORKING)
  const [loading, setLoading] = useState(false)
  const [focusTimer, setFocusTimer] = useState(0) // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const messagesEndRef = useRef(null)
  const heartbeatRef = useRef(null)
  const timerRef = useRef(null)

  // Subscribe to active rooms
  useEffect(() => {
    const unsubscribe = subscribeToRooms(podSlug, (roomsData) => {
      setRooms(roomsData)
    })

    return () => unsubscribe()
  }, [podSlug])

  // Subscribe to current room
  useEffect(() => {
    if (!currentRoom?.id) return

    const unsubscribeRoom = subscribeToRoom(currentRoom.id, (roomData) => {
      if (roomData) {
        setCurrentRoom(roomData)
      } else {
        // Room was deleted
        setCurrentRoom(null)
        setShowRoomView(false)
      }
    })

    const unsubscribeMessages = subscribeToRoomMessages(currentRoom.id, (msgs) => {
      setMessages(msgs)
    })

    // Set up heartbeat
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat(currentRoom.id, userId)
    }, 30000) // Every 30 seconds

    return () => {
      unsubscribeRoom()
      unsubscribeMessages()
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current)
      }
    }
  }, [currentRoom?.id, userId])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setFocusTimer(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isTimerRunning])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (currentRoom?.id) {
        leaveRoom(currentRoom.id, userId)
      }
    }
  }, [currentRoom?.id, userId])

  const formatTimer = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCreateRoom = async (roomData) => {
    setLoading(true)
    const result = await createRoom(userId, {
      ...roomData,
      podSlug,
      hostName: userName,
      hostPhoto: userPhoto
    })

    if (result.success) {
      // Join the created room
      const roomsData = rooms.find(r => r.id === result.roomId)
      if (roomsData) {
        setCurrentRoom(roomsData)
      }
      setShowCreateModal(false)
      setShowRoomView(true)
      setIsTimerRunning(true)
    }
    setLoading(false)
  }

  const handleJoinRoom = async (room) => {
    setLoading(true)
    const result = await joinRoom(room.id, userId, {
      displayName: userName,
      photoURL: userPhoto
    })

    if (result.success) {
      setCurrentRoom(room)
      setShowRoomView(true)
      setIsTimerRunning(true)
    }
    setLoading(false)
  }

  const handleLeaveRoom = async () => {
    if (!currentRoom) return

    setLoading(true)
    await leaveRoom(currentRoom.id, userId)
    setCurrentRoom(null)
    setShowRoomView(false)
    setIsTimerRunning(false)
    setFocusTimer(0)
    setMessages([])
    setLoading(false)
  }

  const handleStatusChange = async (newStatus) => {
    if (!currentRoom) return

    await updateStatus(currentRoom.id, userId, newStatus)
    setMyStatus(newStatus)

    // Pause timer if on break or afk
    setIsTimerRunning(newStatus === SESSION_STATUS.WORKING)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentRoom) return

    await sendRoomMessage(currentRoom.id, userId, newMessage, {
      displayName: userName,
      photoURL: userPhoto
    })
    setNewMessage('')
  }

  // Room View (when in a room)
  if (showRoomView && currentRoom) {
    return (
      <div className="glass p-5 rounded-2xl space-y-5 border border-white/5">
        {/* Room Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-glow-500/20 flex items-center justify-center">
              <span className="text-2xl">{ROOM_TYPES[currentRoom.type]?.icon || '🎯'}</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">{currentRoom.title}</h3>
              <p className="text-xs text-night-400">
                {ROOM_TYPES[currentRoom.type]?.label || 'Focus Room'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            disabled={loading}
            className="p-2.5 text-night-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            title="Leave Room"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Timer & Status */}
        <div className="flex items-center justify-between bg-gradient-to-r from-night-700/50 to-night-700/30 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="text-3xl font-mono font-light text-white tracking-wider">{formatTimer(focusTimer)}</div>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className={`p-2.5 rounded-xl transition-all ${
                isTimerRunning
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {isTimerRunning ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Status Toggle */}
          <div className="flex gap-1.5">
            {Object.entries(SESSION_STATUS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleStatusChange(value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  myStatus === value
                    ? value === 'working'
                      ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/10'
                      : value === 'break'
                        ? 'bg-yellow-500/20 text-yellow-400 shadow-lg shadow-yellow-500/10'
                        : 'bg-zinc-500/20 text-zinc-400'
                    : 'bg-night-600/50 text-night-400 hover:bg-night-600 hover:text-night-200'
                }`}
              >
                {value === 'working' ? '🎯' : value === 'break' ? '☕' : '💤'}
              </button>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-night-400" />
            <span className="text-sm text-night-400">
              {currentRoom.participants?.length || 0} working together
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(currentRoom.participants || []).map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 bg-night-700/30 hover:bg-night-700/50 rounded-xl px-3 py-2 transition-colors"
              >
                <div className="relative">
                  {participant.photoURL ? (
                    <img
                      src={participant.photoURL}
                      alt=""
                      className="w-7 h-7 rounded-full ring-2 ring-white/10"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-xs text-white font-bold">
                      {(participant.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-night-800 ${
                      STATUS_COLORS[participant.status] || STATUS_COLORS.afk
                    }`}
                  />
                </div>
                <span className="text-sm text-white truncate max-w-[80px]">
                  {participant.id === userId ? 'You' : participant.displayName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="bg-night-700/20 rounded-xl p-4">
          <div className="h-28 overflow-y-auto space-y-2.5 mb-3 scrollbar-thin scrollbar-thumb-night-600 scrollbar-track-transparent">
            {messages.length === 0 ? (
              <p className="text-sm text-night-500 text-center py-6">
                👋 Say hi to your co-workers!
              </p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="flex gap-2 items-start">
                  <span className="text-xs text-brand-400 font-medium shrink-0 pt-0.5">
                    {msg.authorId === userId ? 'You' : msg.authorName}
                  </span>
                  <span className="text-sm text-night-200 break-words leading-relaxed">{msg.content}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-night-700/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-night-500 focus:outline-none focus:border-brand-500/50 focus:bg-night-700 transition-all"
              maxLength={200}
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-all"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Browse/Create Rooms View
  return (
    <div className="glass p-5 rounded-2xl space-y-4 border border-white/5 hover:border-white/10 transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xl">🧑‍💻</span>
          <span className="bg-gradient-to-r from-white to-night-200 bg-clip-text text-transparent">
            Live Co-working
          </span>
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 text-xs rounded-lg transition-all border border-brand-500/20"
        >
          <Plus className="w-3 h-3" />
          Create
        </button>
      </div>

      {/* Active Rooms List */}
      {rooms.length === 0 ? (
        <div className="text-center py-6">
          <Coffee className="w-8 h-8 text-night-500 mx-auto mb-2" />
          <p className="text-sm text-night-300">No active rooms</p>
          <p className="text-xs text-night-400 mt-1">Create one to start co-working!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.slice(0, 3).map((room) => (
            <button
              key={room.id}
              onClick={() => handleJoinRoom(room)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 bg-night-700/50 hover:bg-night-700 rounded-lg transition-all text-left"
            >
              <span className="text-xl">{ROOM_TYPES[room.type]?.icon || '🎯'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{room.title}</p>
                <p className="text-xs text-night-300">
                  {room.activeCount || 0} / {room.maxParticipants} working
                </p>
              </div>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                Join
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateRoom}
            podName={podName}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Create Room Modal Component
function CreateRoomModal({ onClose, onCreate, podName, loading }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('FOCUS')

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate({
      title: title.trim() || `${podName} Co-working`,
      type,
      maxParticipants: 10
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-night-800 border border-white/10 rounded-xl w-full max-w-[280px] shadow-xl"
      >
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Create Room</span>
            <button onClick={onClose} className="text-night-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Room Name */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Room name"
            className="w-full bg-night-700 rounded-lg px-3 py-2 text-xs text-white placeholder-night-500 border border-night-600 focus:border-brand-500 focus:outline-none"
            maxLength={50}
          />

          {/* Room Type - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(ROOM_TYPES).map(([key, { label, icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all ${
                  type === key
                    ? 'bg-brand-500/20 text-white'
                    : 'bg-night-700/50 text-night-300 hover:bg-night-700'
                }`}
              >
                <span className="text-sm">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
