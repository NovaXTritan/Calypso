// src/components/OfflineIndicator.jsx - Offline Status Banner

import { useState, useEffect, memo } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Shows a banner when the user goes offline
 * Automatically detects network status changes
 */
function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    let timeoutId = null

    const handleOnline = () => {
      setIsOffline(false)
      setShowReconnected(true)
      // Hide "reconnected" message after 3 seconds
      timeoutId = setTimeout(() => setShowReconnected(false), 3000)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setShowReconnected(false)
      if (timeoutId) clearTimeout(timeoutId)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-orange-500/95 backdrop-blur-sm text-white shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2.5">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              You're offline. Some features may be unavailable.
            </span>
          </div>
        </motion.div>
      )}

      {showReconnected && !isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500/95 backdrop-blur-sm text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2.5">
            <Wifi className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              You're back online!
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default memo(OfflineIndicator)
