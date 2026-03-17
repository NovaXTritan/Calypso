import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import useJournalChat from '../../hooks/useJournalChat'
import GoalSetup from './GoalSetup'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Plus, Send, Trash2, Sparkles, X, Menu, Clock,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STARTERS = [
  "What patterns do you see in my recent journal entries?",
  "Am I spending my time aligned with my goals?",
  "How's my life balance looking?",
  "What should I focus on this week?",
  "I'm feeling stuck — help me figure out why.",
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

function ChatBubble({ message, isUser }) {
  const time = message.createdAt?.toDate
    ? message.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : message.createdAt?.seconds
    ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 group`}>
      <div className={`max-w-[85%] md:max-w-[75%] relative`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-brand-500/20 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-brand-400" />
            </div>
            <span className="text-[10px] text-zinc-500">Cosmos AI</span>
          </div>
        )}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-500/20 border border-brand-500/20 text-zinc-100 rounded-tr-md'
              : 'glass border border-white/5 text-zinc-200 rounded-tl-md'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-strong:text-white prose-ul:my-1 prose-li:my-0.5">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <span className="text-[10px] text-zinc-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity block text-right">
          {time}
        </span>
      </div>
    </div>
  )
}

export default function JournalChat() {
  const { currentUser } = useAuth()
  const [hasGoals, setHasGoals] = useState(null) // null = loading
  const [showSidebar, setShowSidebar] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [optimisticMsg, setOptimisticMsg] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const {
    sessions,
    activeSessionId,
    messages,
    sending,
    error,
    loadingSessions,
    sendMessage,
    startNewChat,
    selectSession,
    deleteSession,
  } = useJournalChat(currentUser?.uid)

  // Check if user has goals configured
  useEffect(() => {
    if (!currentUser) return

    async function checkGoals() {
      const goalsRef = collection(db, 'users', currentUser.uid, 'goals')
      const q = query(goalsRef, orderBy('createdAt', 'desc'), limit(1))
      const snapshot = await getDocs(q)
      setHasGoals(!snapshot.empty)
    }

    checkGoals()
  }, [currentUser])

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, optimisticMsg, sending])

  // Auto-resize textarea
  function handleInputChange(e) {
    setInputValue(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  async function handleSend(messageText) {
    const text = messageText || inputValue
    if (!text.trim() || sending) return

    const trimmed = text.trim()
    setInputValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Optimistic UI
    setOptimisticMsg({ role: 'user', content: trimmed, createdAt: { toDate: () => new Date() } })

    try {
      await sendMessage(trimmed)
      setOptimisticMsg(null)
    } catch (err) {
      setOptimisticMsg(null)
      if (err.code === 'functions/resource-exhausted') {
        toast.error(err.message)
      } else {
        toast.error('Failed to send message')
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleDeleteSession(e, sessionId) {
    e.stopPropagation()
    if (confirm('Delete this chat session?')) {
      deleteSession(sessionId)
    }
  }

  // Loading state
  if (hasGoals === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Goal setup wizard
  if (!hasGoals) {
    return (
      <div className="py-6">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold mb-2">Set Up Your Goals First</h3>
          <p className="text-sm text-zinc-400">
            Your AI analyst needs to know your goals to provide meaningful feedback.
          </p>
        </div>
        <GoalSetup onComplete={() => setHasGoals(true)} />
      </div>
    )
  }

  const isNewChat = !activeSessionId && messages.length === 0
  const allMessages = optimisticMsg
    ? [...messages, optimisticMsg]
    : messages

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] gap-0 relative">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-72 glass rounded-l-2xl border-r border-white/5 overflow-hidden">
        <div className="p-3 border-b border-white/5">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 rounded-xl text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-4">No chats yet</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`w-full text-left p-3 rounded-xl text-sm transition group ${
                  activeSessionId === session.id
                    ? 'bg-brand-500/10 border border-brand-500/20'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-zinc-300 text-xs line-clamp-2 flex-1">
                    {session.title || 'Untitled Chat'}
                  </span>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-zinc-600" />
                  <span className="text-[10px] text-zinc-600">
                    {session.updatedAt?.toDate
                      ? session.updatedAt.toDate().toLocaleDateString()
                      : session.updatedAt?.seconds
                      ? new Date(session.updatedAt.seconds * 1000).toLocaleDateString()
                      : ''}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {session.messageCount || 0} msgs
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-72 glass z-50 flex flex-col md:hidden"
            >
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <button
                  onClick={() => { startNewChat(); setShowSidebar(false) }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 rounded-xl text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4" /> New Chat
                </button>
                <button onClick={() => setShowSidebar(false)} className="ml-2 p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => { selectSession(session.id); setShowSidebar(false) }}
                    className={`w-full text-left p-3 rounded-xl text-sm transition ${
                      activeSessionId === session.id
                        ? 'bg-brand-500/10 border border-brand-500/20'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="text-zinc-300 text-xs line-clamp-2">{session.title || 'Untitled Chat'}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-600">{session.messageCount || 0} msgs</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col glass md:rounded-r-2xl md:rounded-l-none rounded-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="p-3 border-b border-white/5 flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg"
          >
            <Menu className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium">Journal Analyst</h4>
              <p className="text-[10px] text-zinc-500">Evidence-based insights from your journal</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {isNewChat && allMessages.length === 0 ? (
            /* Empty state with conversation starters */
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Start a Conversation</h3>
              <p className="text-xs text-zinc-500 mb-6 text-center max-w-sm">
                Ask me about patterns in your journal, goal alignment, life balance, or anything on your mind.
              </p>
              <div className="grid gap-2 w-full max-w-md">
                {STARTERS.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(starter)}
                    disabled={sending}
                    className="text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-500/20 rounded-xl text-sm text-zinc-300 transition disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {allMessages.map((msg, i) => (
                <ChatBubble
                  key={msg.id || `opt-${i}`}
                  message={msg}
                  isUser={msg.role === 'user'}
                />
              ))}
              {sending && !optimisticMsg && <TypingIndicator />}
              {sending && optimisticMsg && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your journal patterns..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm resize-none overflow-hidden"
                rows={1}
                maxLength={2000}
                disabled={sending}
              />
              <span className="absolute bottom-1.5 right-3 text-[10px] text-zinc-600">
                {inputValue.length}/2000
              </span>
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || sending}
              className="p-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/30 disabled:cursor-not-allowed rounded-xl transition flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
