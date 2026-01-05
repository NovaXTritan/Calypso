// src/components/ui/Loading.jsx - Unified Loading Components

import { memo } from 'react'

/**
 * Animated spinner component
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} className - Additional CSS classes
 */
export const LoadingSpinner = memo(function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-2',
    xl: 'w-16 h-16 border-3'
  }

  return (
    <div
      className={`${sizes[size]} rounded-full border-brand-500/20 border-t-brand-500 animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
})

/**
 * Full page loading state with centered spinner
 * @param {string} text - Optional loading text
 */
export const PageLoading = memo(function PageLoading({ text = '' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <LoadingSpinner size="lg" />
      {text && <p className="text-zinc-400 text-sm">{text}</p>}
    </div>
  )
})

/**
 * Skeleton card placeholder for content loading
 * Based on the PodForum pattern
 */
export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="glass p-5 rounded-xl animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-zinc-700" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-32 bg-zinc-700 rounded" />
          <div className="h-3 w-24 bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-zinc-800 rounded" />
        <div className="h-4 w-3/4 bg-zinc-800 rounded" />
        <div className="h-4 w-1/2 bg-zinc-800 rounded" />
      </div>
    </div>
  )
})

/**
 * Skeleton list with multiple cards
 * @param {number} count - Number of skeleton cards to show
 */
export const SkeletonList = memo(function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
})

/**
 * Inline loading indicator with spinner and text
 * @param {string} text - Loading text to display
 */
export const InlineLoading = memo(function InlineLoading({ text = 'Loading...' }) {
  return (
    <div className="flex items-center gap-2 text-zinc-400">
      <LoadingSpinner size="sm" />
      <span className="text-sm">{text}</span>
    </div>
  )
})

/**
 * Button loading state
 * Use inside buttons when performing async actions
 */
export const ButtonSpinner = memo(function ButtonSpinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
})

/**
 * Skeleton row for table or list items
 */
export const SkeletonRow = memo(function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-zinc-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 bg-zinc-700 rounded" />
        <div className="h-3 w-1/4 bg-zinc-800 rounded" />
      </div>
      <div className="w-20 h-8 bg-zinc-700 rounded" />
    </div>
  )
})

/**
 * Skeleton for event cards
 */
export const SkeletonEventCard = memo(function SkeletonEventCard() {
  return (
    <div className="glass p-5 rounded-xl animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-5 w-3/4 bg-zinc-700 rounded" />
          <div className="h-4 w-1/2 bg-zinc-800 rounded" />
        </div>
        <div className="w-20 h-8 bg-zinc-700 rounded-lg" />
      </div>
      <div className="h-4 w-full bg-zinc-800 rounded" />
    </div>
  )
})

export default {
  LoadingSpinner,
  PageLoading,
  SkeletonCard,
  SkeletonList,
  InlineLoading,
  ButtonSpinner,
  SkeletonRow,
  SkeletonEventCard
}
