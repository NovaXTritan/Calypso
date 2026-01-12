// src/utils/retry.js - Retry utilities with exponential backoff

/**
 * Retryable Firebase error codes
 * These errors are transient and may succeed on retry
 */
const RETRYABLE_ERROR_CODES = [
  'unavailable',           // Service temporarily unavailable
  'resource-exhausted',    // Rate limited
  'deadline-exceeded',     // Timeout
  'aborted',              // Concurrent modification conflict
  'internal',             // Internal server error
  'unknown'               // Unknown error (network issues)
]

/**
 * Check if an error is retryable
 */
export function isRetryableError(error) {
  if (!error) return false

  // Firebase error codes
  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
    return true
  }

  // Network errors
  if (error.message?.includes('network') ||
      error.message?.includes('Network') ||
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('fetch')) {
    return true
  }

  return false
}

/**
 * Sleep for a specified duration
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt, baseDelay, maxDelay) {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt)

  // Add jitter (0-100% of exponential delay) to prevent thundering herd
  const jitter = Math.random() * exponentialDelay

  // Cap at max delay
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Retry a function with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Custom retry predicate (default: isRetryableError)
 * @param {Function} options.onRetry - Callback on retry (receives error, attempt number)
 * @returns {Promise} - Result of the function
 */
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = isRetryableError,
    onRetry = null
  } = options

  let lastError

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts - 1
      const canRetry = shouldRetry(error)

      if (isLastAttempt || !canRetry) {
        throw error
      }

      // Calculate delay
      const delay = calculateDelay(attempt, baseDelay, maxDelay)

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(error, attempt + 1, delay)
      }

      // Wait before retrying
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Wrap a function with timeout
 *
 * @param {Function} fn - Async function to wrap
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @param {string} operation - Operation name for error message
 * @returns {Promise} - Result or timeout error
 */
export async function withTimeout(fn, timeoutMs = 30000, operation = 'Operation') {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

/**
 * Combine retry with timeout for robust Firestore operations
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout per attempt in ms (default: 15000)
 * @param {number} options.maxAttempts - Maximum retry attempts (default: 3)
 * @param {string} options.operation - Operation name for logging
 * @returns {Promise} - Result of the function
 */
export async function firestoreOperation(fn, options = {}) {
  const {
    timeout = 15000,
    maxAttempts = 3,
    operation = 'Firestore operation',
    onRetry = null
  } = options

  return withRetry(
    () => withTimeout(fn, timeout, operation),
    {
      maxAttempts,
      baseDelay: 1000,
      maxDelay: 10000,
      onRetry: (error, attempt, delay) => {
        console.warn(
          `[Retry] ${operation} failed (attempt ${attempt}/${maxAttempts}), ` +
          `retrying in ${Math.round(delay)}ms:`,
          error.message
        )
        if (onRetry) onRetry(error, attempt, delay)
      }
    }
  )
}

/**
 * Firebase error categorization for user-friendly messages
 */
export const FirebaseErrorMessages = {
  'permission-denied': 'You do not have permission to perform this action.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please try again in a moment.',
  'failed-precondition': 'The operation cannot be completed at this time.',
  'aborted': 'The operation was cancelled. Please try again.',
  'out-of-range': 'Invalid data provided.',
  'unimplemented': 'This feature is not available.',
  'internal': 'An internal error occurred. Please try again.',
  'unavailable': 'Service is temporarily unavailable. Please try again.',
  'data-loss': 'Data may have been lost. Please contact support.',
  'unauthenticated': 'Your session has expired. Please log in again.',
  'deadline-exceeded': 'The request took too long. Please try again.',
  'cancelled': 'The operation was cancelled.',
  'unknown': 'An unexpected error occurred. Please try again.'
}

/**
 * Get user-friendly error message from Firebase error
 */
export function getFirebaseErrorMessage(error) {
  if (!error) return 'An error occurred.'

  // Check for Firebase error code
  if (error.code && FirebaseErrorMessages[error.code]) {
    return FirebaseErrorMessages[error.code]
  }

  // Check for network errors
  if (error.message?.includes('network') || error.message?.includes('Network')) {
    return 'Network error. Please check your connection and try again.'
  }

  // Check for timeout
  if (error.message?.includes('timed out')) {
    return 'The request took too long. Please try again.'
  }

  // Default message
  return 'An error occurred. Please try again.'
}
