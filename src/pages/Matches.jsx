import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Users, Target, Zap, MessageCircle, Sparkles } from 'lucide-react'
import Avatar from '../components/Avatar'
import { getOrCreateConversation, subscribeToConversations } from '../lib/chat'
import { calculateMatches, getMatchReason, getMatchQuality } from '../lib/matching'
import toast from 'react-hot-toast'
import { trackError, ErrorCategory } from '../utils/errorTracking'

export default function Matches(){
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterPod, setFilterPod] = useState('all')
  const [filterGoal, setFilterGoal] = useState('all')
  const [availablePods, setAvailablePods] = useState([])
  const [availableGoals, setAvailableGoals] = useState([])
  const [conversations, setConversations] = useState([])
  const [startingChat, setStartingChat] = useState(null)

  // Subscribe to existing conversations
  useEffect(() => {
    if (!currentUser?.uid) return

    const unsubscribe = subscribeToConversations(currentUser.uid, (convs) => {
      setConversations(convs)
    })

    return () => unsubscribe()
  }, [currentUser?.uid])

  // Check if already chatting with a user
  function getExistingConversation(userId) {
    return conversations.find(conv =>
      conv.participants.includes(userId)
    )
  }

  useEffect(() => {
    fetchUsers()
  }, [currentUser])

  useEffect(() => {
    applyFilters()
  }, [users, filterPod, filterGoal])

  async function fetchUsers() {
    if (!currentUser) return

    try {
      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      // Fetch posts to calculate activity
      const postsSnapshot = await getDocs(collection(db, 'posts'))
      const allPosts = postsSnapshot.docs.map(doc => doc.data())

      // Use the sophisticated matching algorithm
      const matchedUsers = calculateMatches(currentUser, allUsers, allPosts)
      setUsers(matchedUsers)

      // Extract unique pods and goals for filters
      const pods = new Set()
      const goals = new Set()
      matchedUsers.forEach(user => {
        (user.joinedPods || []).forEach(pod => pods.add(pod))
        ;(user.goals || []).forEach(goal => goals.add(goal))
      })
      setAvailablePods(Array.from(pods))
      setAvailableGoals(Array.from(goals))

    } catch (error) {
      trackError(error, { action: 'fetchMatches', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to load matches')
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...users]

    if (filterPod !== 'all') {
      filtered = filtered.filter(user => 
        (user.joinedPods || []).includes(filterPod)
      )
    }

    if (filterGoal !== 'all') {
      filtered = filtered.filter(user =>
        (user.goals || []).some(g => g.toLowerCase().includes(filterGoal.toLowerCase()))
      )
    }

    setFilteredUsers(filtered)
  }

  async function startChat(user) {
    setStartingChat(user.uid)
    try {
      const conversation = await getOrCreateConversation(currentUser, user)
      navigate(`/chat/${conversation.id}`)
    } catch (error) {
      trackError(error, { action: 'startChat', userId: currentUser?.uid, targetUserId: user?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to start chat')
    } finally {
      setStartingChat(null)
    }
  }

  function openExistingChat(conversationId) {
    navigate(`/chat/${conversationId}`)
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-zinc-400">Loading matches...</div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Discover Peers</h2>
      <p className="text-zinc-300 mb-8">Find people with similar learning goals</p>

      {/* Filters */}
      <div className="glass p-5 rounded-2xl mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Filter by Pod</label>
            <select
              value={filterPod}
              onChange={(e) => setFilterPod(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="all">All Pods</option>
              {availablePods.map(pod => (
                <option key={pod} value={pod}>{pod}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Filter by Goal</label>
            <select
              value={filterGoal}
              onChange={(e) => setFilterGoal(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="all">All Goals</option>
              {availableGoals.map(goal => (
                <option key={goal} value={goal}>{goal}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* User Cards */}
      {filteredUsers.length === 0 ? (
        <div className="glass p-8 rounded-2xl text-center text-zinc-400">
          No matches found. Try adjusting your filters or join more pods!
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map(user => (
            <div key={user.id} className="glass p-5 rounded-2xl">
              {/* Match Score Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Avatar user={user} />
                  <div>
                    <div className="font-semibold">{user.displayName || 'Anonymous'}</div>
                    <div className="text-xs text-zinc-400">
                      {getMatchReason(user)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-brand-400/20">
                    <Sparkles size={14} className="text-brand-400" />
                    <span className="text-sm font-semibold text-brand-400">
                      {user.matchScore}%
                    </span>
                  </div>
                  <span className={`text-[10px] ${getMatchQuality(user.matchScore).color}`}>
                    {getMatchQuality(user.matchScore).label}
                  </span>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-sm text-zinc-300 mb-3 line-clamp-2">{user.bio}</p>
              )}

              {/* Common Pods */}
              {user.commonPods && user.commonPods.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1 text-xs text-zinc-400 mb-1">
                    <Users size={12} />
                    <span>Common Pods</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.commonPods.slice(0, 3).map(pod => (
                      <span
                        key={pod}
                        className="px-2 py-1 rounded-md bg-white/10 text-xs"
                      >
                        {pod}
                      </span>
                    ))}
                    {user.commonPods.length > 3 && (
                      <span className="px-2 py-1 text-xs text-zinc-400">
                        +{user.commonPods.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Common Goals */}
              {user.commonGoals && user.commonGoals.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-1 text-xs text-zinc-400 mb-1">
                    <Target size={12} />
                    <span>Common Goals</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.commonGoals.slice(0, 2).map((goal, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-white/5 text-xs text-zinc-300"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                <Zap size={12} />
                <span>{user.recentActivity} proofs this week</span>
              </div>

              {/* Chat Button */}
              {(() => {
                const existingConv = getExistingConversation(user.uid)
                if (existingConv) {
                  return (
                    <button
                      onClick={() => openExistingChat(existingConv.id)}
                      className="w-full flex items-center justify-center gap-2 btn-ghost py-2 text-sm"
                    >
                      <MessageCircle size={14} />
                      Continue Chat
                    </button>
                  )
                }
                return (
                  <button
                    onClick={() => startChat(user)}
                    disabled={startingChat === user.uid}
                    className="w-full flex items-center justify-center gap-2 btn-primary py-2 text-sm disabled:opacity-50"
                  >
                    {startingChat === user.uid ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle size={14} />
                        Start Chat
                      </>
                    )}
                  </button>
                )
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Recent Conversations */}
      {conversations.length > 0 && (
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-4">Recent Chats</h3>
          <div className="space-y-2">
            {conversations.slice(0, 5).map(conv => {
              const otherId = conv.participants.find(id => id !== currentUser.uid)
              const other = conv.participantData?.[otherId]

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="w-full flex items-center gap-3 p-4 glass rounded-xl hover:bg-white/10 transition text-left"
                >
                  <Avatar
                    user={{ photoURL: other?.photoURL, displayName: other?.name }}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{other?.name || 'User'}</div>
                    {conv.lastMessage && (
                      <p className="text-sm text-zinc-400 truncate">
                        {conv.lastMessage.senderId === currentUser.uid ? 'You: ' : ''}
                        {conv.lastMessage.text}
                      </p>
                    )}
                  </div>
                  <MessageCircle size={18} className="text-zinc-400" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
