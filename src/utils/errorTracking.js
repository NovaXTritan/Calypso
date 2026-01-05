// src/utils/errorTracking.js - Centralized Error Tracking Utility

export const ErrorSeverity = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
}

export const ErrorCategory = {
  NETWORK: 'network',
  AUTH: 'auth',
  FIRESTORE: 'firestore',
  STORAGE: 'storage',
  VALIDATION: 'validation',
  UI: 'ui',
  NOTIFICATION: 'notification',
  UNKNOWN: 'unknown'
}

// Error queue for batching (future external service integration)
const errorQueue = []
const MAX_QUEUE_SIZE = 50
const isDev = import.meta.env.DEV

// Deduplication cache to prevent spam
const recentErrors = new Map()
const DEDUP_WINDOW_MS = 5000

/**
 * Generate a simple hash for error deduplication
 */
function getErrorKey(error, context) {
  const message = error?.message || String(error)
  const action = context?.action || 'unknown'
  return `${action}:${message.slice(0, 100)}`
}

/**
 * Check if error was recently logged (deduplication)
 */
function isDuplicateError(key) {
  const now = Date.now()
  const lastSeen = recentErrors.get(key)

  if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
    return true
  }

  recentErrors.set(key, now)

  // Clean old entries
  if (recentErrors.size > 100) {
    const cutoff = now - DEDUP_WINDOW_MS
    for (const [k, time] of recentErrors) {
      if (time < cutoff) recentErrors.delete(k)
    }
  }

  return false
}

/**
 * Format error for development console
 */
function formatDevError(error, context, severity, category) {
  const styles = {
    debug: 'color: #888',
    info: 'color: #3b82f6',
    warn: 'color: #f59e0b',
    error: 'color: #ef4444',
    critical: 'color: #fff; background: #ef4444; padding: 2px 6px; border-radius: 3px'
  }

  return {
    style: styles[severity] || styles.error,
    prefix: `[${category.toUpperCase()}]`,
    message: error?.message || String(error),
    context
  }
}

/**
 * Track an error with context
 * @param {Error|string} error - The error object or message
 * @param {Object} context - Additional context (action, userId, etc.)
 * @param {string} severity - Error severity level
 * @param {string} category - Error category
 */
export function trackError(error, context = {}, severity = ErrorSeverity.ERROR, category = ErrorCategory.UNKNOWN) {
  const errorKey = getErrorKey(error, context)

  // Skip duplicate errors
  if (isDuplicateError(errorKey)) {
    return
  }

  const errorData = {
    message: error?.message || String(error),
    stack: error?.stack,
    code: error?.code,
    severity,
    category,
    context: {
      ...context,
      url: typeof window !== 'undefined' ? window.location.href : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    },
    timestamp: new Date().toISOString()
  }

  // Development: log to console with formatting
  if (isDev) {
    const { style, prefix, message } = formatDevError(error, context, severity, category)

    if (severity === ErrorSeverity.DEBUG) {
      console.debug(`%c${prefix}`, style, message, context)
    } else if (severity === ErrorSeverity.WARN) {
      console.warn(`%c${prefix}`, style, message, context)
    } else {
      console.error(`%c${prefix}`, style, message, context)
    }
  }

  // Add to queue for potential external service
  errorQueue.push(errorData)

  // Trim queue if too large
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue.shift()
  }

  // Critical errors could trigger immediate action
  if (severity === ErrorSeverity.CRITICAL) {
    // Future: send immediately to external service
    // sendToExternalService(errorData)
  }
}

/**
 * Track an event (non-error tracking)
 * @param {string} eventName - Name of the event
 * @param {Object} data - Event data
 */
export function trackEvent(eventName, data = {}) {
  if (isDev) {
    console.log(`%c[EVENT] ${eventName}`, 'color: #10b981', data)
  }

  // Future: send to analytics service
}

/**
 * Get queued errors (for debugging or batch sending)
 */
export function getErrorQueue() {
  return [...errorQueue]
}

/**
 * Clear error queue
 */
export function clearErrorQueue() {
  errorQueue.length = 0
}

/**
 * Flush errors to external service (placeholder for future integration)
 */
export async function flushErrors() {
  if (errorQueue.length === 0) return

  const errors = [...errorQueue]
  clearErrorQueue()

  // Future: implement actual sending
  // await fetch('/api/errors', { method: 'POST', body: JSON.stringify(errors) })

  if (isDev) {
    console.log(`%c[ERROR TRACKING] Would flush ${errors.length} errors`, 'color: #8b5cf6')
  }
}

// Auto-flush on page unload (future enhancement)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (errorQueue.length > 0) {
      // Use sendBeacon for reliability
      // navigator.sendBeacon('/api/errors', JSON.stringify(errorQueue))
    }
  })
}

export default {
  trackError,
  trackEvent,
  getErrorQueue,
  clearErrorQueue,
  flushErrors,
  ErrorSeverity,
  ErrorCategory
}
