import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import usePullToRefresh from '../hooks/usePullToRefresh'

export default function PullToRefresh({ onRefresh, children }) {
  const { isPulling, pullDistance, isRefreshing, progress } = usePullToRefresh(onRefresh)

  return (
    <div className="relative">
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && pullDistance > 10 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50"
            style={{ transform: `translateX(-50%) translateY(${Math.min(pullDistance - 10, 40)}px)` }}
          >
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full
              bg-night-900 border border-white/20 shadow-lg
              ${isRefreshing ? 'animate-pulse' : ''}
            `}>
              <RefreshCw
                size={20}
                className={`text-brand-400 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
                style={{
                  transform: isRefreshing ? 'rotate(0deg)' : `rotate(${progress * 180}deg)`
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with pull offset */}
      <motion.div
        animate={{
          y: isPulling ? pullDistance * 0.3 : 0
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
