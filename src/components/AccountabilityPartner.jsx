// AccountabilityPartner.jsx - Accountability Partner widget for pods
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  findAccountabilityPartner,
  getExistingPartner,
  requestPartnership,
  acceptPartnership,
  endPartnership,
  checkPartnerActivity,
  sendNudge
} from '../lib/accountability'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function AccountabilityPartner({ userId, userEmail, podSlug }) {
  const [partner, setPartner] = useState(null)
  const [suggestedPartner, setSuggestedPartner] = useState(null)
  const [pendingRequests, setPendingRequests] = useState([])
  const [partnerActivity, setPartnerActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showFindPartner, setShowFindPartner] = useState(false)
  const [nudgeSent, setNudgeSent] = useState(false)

  // Load existing partner or find suggestions
  useEffect(() => {
    if (!userId || !podSlug) return

    const loadPartnerData = async () => {
      setLoading(true)
      try {
        // Check for existing partner
        const existingPartner = await getExistingPartner(userId, podSlug)
        if (existingPartner) {
          setPartner(existingPartner)
          // Check partner activity
          const activity = await checkPartnerActivity(userId, existingPartner.id, podSlug)
          setPartnerActivity(activity)
        } else {
          setPartner(null)
        }
      } catch (error) {
        console.error('Error loading partner data:', error)
      }
      setLoading(false)
    }

    loadPartnerData()
  }, [userId, podSlug])

  // Listen for pending partnership requests
  useEffect(() => {
    if (!userId) return

    const requestsQuery = query(
      collection(db, 'partnershipRequests'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
      const requests = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data()
          // Fetch requester info
          const requesterDoc = await getDoc(doc(db, 'users', data.fromUserId))
          return {
            id: docSnap.id,
            ...data,
            requester: requesterDoc.exists() ? requesterDoc.data() : null
          }
        })
      )
      setPendingRequests(requests.filter(r => r.podSlug === podSlug))
    })

    return () => unsubscribe()
  }, [userId, podSlug])

  const handleFindPartner = async () => {
    setActionLoading(true)
    try {
      const suggested = await findAccountabilityPartner(userId, podSlug)
      setSuggestedPartner(suggested)
      setShowFindPartner(true)
    } catch (error) {
      console.error('Error finding partner:', error)
    }
    setActionLoading(false)
  }

  const handleRequestPartnership = async (partnerId) => {
    setActionLoading(true)
    try {
      await requestPartnership(userId, partnerId, podSlug)
      setShowFindPartner(false)
      setSuggestedPartner(null)
    } catch (error) {
      console.error('Error requesting partnership:', error)
    }
    setActionLoading(false)
  }

  const handleAcceptRequest = async (fromUserId) => {
    setActionLoading(true)
    try {
      await acceptPartnership(userId, fromUserId, podSlug)
      // Reload partner data
      const existingPartner = await getExistingPartner(userId, podSlug)
      setPartner(existingPartner)
    } catch (error) {
      console.error('Error accepting partnership:', error)
    }
    setActionLoading(false)
  }

  const handleEndPartnership = async () => {
    if (!partner) return
    if (!confirm('Are you sure you want to end this partnership?')) return

    setActionLoading(true)
    try {
      await endPartnership(userId, partner.id, podSlug)
      setPartner(null)
      setPartnerActivity(null)
    } catch (error) {
      console.error('Error ending partnership:', error)
    }
    setActionLoading(false)
  }

  const handleSendNudge = async () => {
    if (!partner || nudgeSent) return

    setActionLoading(true)
    try {
      await sendNudge(userId, partner.id, podSlug)
      setNudgeSent(true)
      setTimeout(() => setNudgeSent(false), 60000) // Reset after 1 minute
    } catch (error) {
      console.error('Error sending nudge:', error)
    }
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="glass p-4 rounded-xl">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-night-600 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-night-600 rounded w-3/4 mb-2" />
            <div className="h-3 bg-night-600 rounded w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass p-5 rounded-2xl space-y-4 border border-white/5 hover:border-white/10 transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-xl">🤝</span>
          <span className="bg-gradient-to-r from-white to-night-200 bg-clip-text text-transparent">
            Accountability Partner
          </span>
        </h3>
        {partner && (
          <button
            onClick={handleEndPartnership}
            className="text-xs text-night-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
            disabled={actionLoading}
          >
            End
          </button>
        )}
      </div>

      {/* Pending Requests */}
      <AnimatePresence>
        {pendingRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-brand-500/20 border border-brand-500/30 rounded-lg p-3"
              >
                <p className="text-sm text-white mb-2">
                  <span className="font-medium">
                    {request.requester?.displayName || 'Someone'}
                  </span>{' '}
                  wants to be your accountability partner!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptRequest(request.fromUserId)}
                    disabled={actionLoading}
                    className="flex-1 py-1.5 px-3 bg-brand-500 text-white text-sm rounded-lg
                             hover:bg-brand-600 transition-colors disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    disabled={actionLoading}
                    className="py-1.5 px-3 bg-night-600 text-night-200 text-sm rounded-lg
                             hover:bg-night-500 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Partner */}
      {partner ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {partner.photoURL ? (
              <img
                src={partner.photoURL}
                alt={partner.displayName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600
                            flex items-center justify-center text-white font-bold">
                {(partner.displayName || 'P')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">
                {partner.displayName || 'Partner'}
              </p>
              <p className="text-xs text-night-300">
                {partner.streak || 0} day streak
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              partnerActivity?.postedToday
                ? 'bg-green-500'
                : 'bg-yellow-500 animate-pulse'
            }`} title={partnerActivity?.postedToday ? 'Posted today' : 'Waiting for proof'} />
          </div>

          {/* Partner Activity Status */}
          <div className={`text-sm p-2 rounded-lg ${
            partnerActivity?.postedToday
              ? 'bg-green-500/10 text-green-400'
              : 'bg-yellow-500/10 text-yellow-400'
          }`}>
            {partnerActivity?.postedToday ? (
              <span>✓ Posted today - Keep the streak going!</span>
            ) : (
              <span>⏳ Waiting for today's proof...</span>
            )}
          </div>

          {/* Nudge Button */}
          {!partnerActivity?.postedToday && (
            <button
              onClick={handleSendNudge}
              disabled={actionLoading || nudgeSent}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all
                        ${nudgeSent
                          ? 'bg-night-600 text-night-300 cursor-not-allowed'
                          : 'bg-glow-500/20 text-glow-400 hover:bg-glow-500/30 border border-glow-500/30'
                        }`}
            >
              {nudgeSent ? '✓ Nudge Sent!' : '👋 Send a Friendly Nudge'}
            </button>
          )}
        </div>
      ) : (
        /* No Partner - Find One */
        <div className="space-y-3">
          <p className="text-sm text-night-300 text-center">
            Learning together is more effective. Find a partner to stay accountable!
          </p>

          {!showFindPartner ? (
            <button
              onClick={handleFindPartner}
              disabled={actionLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-500 to-brand-600
                       text-white rounded-lg font-medium hover:from-brand-600 hover:to-brand-700
                       transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <span>🔍</span>
                  Find a Partner
                </>
              )}
            </button>
          ) : suggestedPartner ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-night-700/50 rounded-lg p-3 space-y-3"
            >
              <div className="flex items-center gap-3">
                {suggestedPartner.photoURL ? (
                  <img
                    src={suggestedPartner.photoURL}
                    alt={suggestedPartner.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600
                                flex items-center justify-center text-white font-bold text-lg">
                    {(suggestedPartner.displayName || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-medium">
                    {suggestedPartner.displayName || 'User'}
                  </p>
                  <p className="text-xs text-night-300">
                    {suggestedPartner.compatibility?.score}% compatible
                  </p>
                </div>
              </div>

              {/* Match Reasons */}
              {suggestedPartner.compatibility?.reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {suggestedPartner.compatibility.reasons.map((reason, i) => (
                    <span
                      key={i}
                      className="text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleRequestPartnership(suggestedPartner.id)}
                  disabled={actionLoading}
                  className="flex-1 py-2 px-3 bg-brand-500 text-white text-sm rounded-lg
                           hover:bg-brand-600 transition-colors disabled:opacity-50"
                >
                  Send Request
                </button>
                <button
                  onClick={() => {
                    setShowFindPartner(false)
                    setSuggestedPartner(null)
                  }}
                  className="py-2 px-3 bg-night-600 text-night-200 text-sm rounded-lg
                           hover:bg-night-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-4 text-night-400 text-sm">
              <p>No available partners found in this pod yet.</p>
              <p className="text-xs mt-1">Check back as more learners join!</p>
              <button
                onClick={() => setShowFindPartner(false)}
                className="mt-2 text-brand-400 hover:text-brand-300"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
