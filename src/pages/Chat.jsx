import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Send, MoreVertical } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/Avatar'
import {
  getConversation,
  subscribeToMessages,
  sendMessage,
  markMessagesAsRead,
  formatMessageTime
} from '../lib/chat'
import toast from 'react-hot-toast'

export default function Chat() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Get conversation details
  useEffect(() => {
    if (!chatId) return

    async function loadConversation() {
      const conv = await getConversation(chatId)
      if (conv) {
        setConversation(conv)
      } else {
        toast.error('Conversation not found')
        navigate('/matches')
      }
      setLoading(false)
    }

    loadConversation()
  }, [chatId, navigate])

  // Subscribe to messages
  useEffect(() => {
    if (!chatId) return

    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs)
    })

    return () => unsubscribe()
  }, [chatId])

  // Mark messages as read when viewing
  useEffect(() => {
    if (chatId && currentUser?.uid && messages.length > 0) {
      markMessagesAsRead(chatId, currentUser.uid)
    }
  }, [chatId, currentUser?.uid, messages.length])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Get other participant's data
  const otherUserId = conversation?.participants?.find(id => id !== currentUser?.uid)
  const otherUser = otherUserId ? conversation?.participantData?.[otherUserId] : null

  async function handleSend(e) {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await sendMessage(chatId, currentUser.uid, newMessage)
      setNewMessage('')
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-80px)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-night-900/80 backdrop-blur border-b border-white/10">
        <button
          onClick={() => navigate('/matches')}
          className="p-2 hover:bg-white/10 rounded-xl transition"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3 flex-1">
          <Avatar
            user={{ photoURL: otherUser?.photoURL, displayName: otherUser?.name }}
            size="sm"
          />
          <div>
            <h2 className="font-semibold">{otherUser?.name || 'User'}</h2>
            <p className="text-xs text-zinc-400">Active now</p>
          </div>
        </div>

        <button className="p-2 hover:bg-white/10 rounded-xl transition">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mb-4">
              <Avatar
                user={{ photoURL: otherUser?.photoURL, displayName: otherUser?.name }}
                size="lg"
              />
            </div>
            <h3 className="text-lg font-semibold mb-1">{otherUser?.name}</h3>
            <p className="text-zinc-400 text-sm">
              Start the conversation! Say hello.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUser?.uid
              const showAvatar = index === 0 ||
                messages[index - 1]?.senderId !== message.senderId

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {!isOwn && showAvatar ? (
                    <Avatar
                      user={{ photoURL: otherUser?.photoURL, displayName: otherUser?.name }}
                      size="xs"
                    />
                  ) : !isOwn ? (
                    <div className="w-6" />
                  ) : null}

                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-brand-500 text-white rounded-br-sm'
                        : 'bg-white/10 text-white rounded-bl-sm'
                    }`}
                  >
                    <p className="break-words">{message.text}</p>
                    <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-zinc-500'}`}>
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 bg-night-900/80 backdrop-blur border-t border-white/10 safe-bottom"
      >
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}
