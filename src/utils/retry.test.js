// src/utils/retry.test.js - Tests for retry utilities
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isRetryableError,
  withRetry,
  withTimeout,
  firestoreOperation,
  getFirebaseErrorMessage,
  FirebaseErrorMessages
} from './retry'

describe('isRetryableError', () => {
  it('should return true for retryable Firebase error codes', () => {
    const retryableCodes = [
      'unavailable',
      'resource-exhausted',
      'deadline-exceeded',
      'aborted',
      'internal',
      'unknown'
    ]

    retryableCodes.forEach(code => {
      expect(isRetryableError({ code })).toBe(true)
    })
  })

  it('should return false for non-retryable Firebase error codes', () => {
    const nonRetryableCodes = [
      'permission-denied',
      'not-found',
      'already-exists',
      'invalid-argument',
      'unauthenticated'
    ]

    nonRetryableCodes.forEach(code => {
      expect(isRetryableError({ code })).toBe(false)
    })
  })

  it('should return true for network errors', () => {
    expect(isRetryableError({ message: 'network error occurred' })).toBe(true)
    expect(isRetryableError({ message: 'Network request failed' })).toBe(true)
    expect(isRetryableError({ message: 'ECONNREFUSED' })).toBe(true)
    expect(isRetryableError({ message: 'ETIMEDOUT' })).toBe(true)
    expect(isRetryableError({ message: 'fetch failed' })).toBe(true)
  })

  it('should return false for null or undefined', () => {
    expect(isRetryableError(null)).toBe(false)
    expect(isRetryableError(undefined)).toBe(false)
  })

  it('should return false for non-retryable errors', () => {
    expect(isRetryableError({ message: 'Some other error' })).toBe(false)
    expect(isRetryableError(new Error('Generic error'))).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 'unavailable' })
      .mockResolvedValueOnce('success')

    const promise = withRetry(fn, { maxAttempts: 3, baseDelay: 100 })

    // Advance through the delay
    await vi.advanceTimersByTimeAsync(200)

    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should not retry on non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue({ code: 'permission-denied' })

    await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toEqual({ code: 'permission-denied' })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should respect maxAttempts', async () => {
    // Use real timers for this test to avoid fake timer issues
    vi.useRealTimers()

    const fn = vi.fn().mockRejectedValue({ code: 'unavailable' })

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelay: 10, maxDelay: 50 })
    ).rejects.toEqual({ code: 'unavailable' })

    expect(fn).toHaveBeenCalledTimes(3)

    // Restore fake timers for subsequent tests
    vi.useFakeTimers()
  })

  it('should call onRetry callback', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 'unavailable' })
      .mockResolvedValueOnce('success')

    const onRetry = vi.fn()

    const promise = withRetry(fn, {
      maxAttempts: 3,
      baseDelay: 100,
      onRetry
    })

    await vi.advanceTimersByTimeAsync(500)
    await promise

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(
      { code: 'unavailable' },
      1,
      expect.any(Number)
    )
  })

  it('should use custom shouldRetry predicate', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ custom: true })
      .mockResolvedValueOnce('success')

    const shouldRetry = (error) => error.custom === true

    const promise = withRetry(fn, {
      maxAttempts: 3,
      baseDelay: 100,
      shouldRetry
    })

    await vi.advanceTimersByTimeAsync(500)
    const result = await promise

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return result if function completes before timeout', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withTimeout(fn, 1000)

    expect(result).toBe('success')
  })

  it('should reject with timeout error if function takes too long', async () => {
    const fn = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve('late'), 5000))
    )

    const promise = withTimeout(fn, 1000, 'Test operation')

    // Advance past timeout
    vi.advanceTimersByTime(1500)

    await expect(promise).rejects.toThrow('Test operation timed out after 1000ms')
  })

  it('should use default timeout of 30000ms', async () => {
    const fn = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve('success'), 25000))
    )

    const promise = withTimeout(fn)

    // Advance to just before default timeout
    vi.advanceTimersByTime(25000)

    await expect(promise).resolves.toBe('success')
  })
})

describe('firestoreOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return result on success', async () => {
    const fn = vi.fn().mockResolvedValue({ data: 'test' })

    const result = await firestoreOperation(fn, { operation: 'Test' })

    expect(result).toEqual({ data: 'test' })
  })

  it('should retry on retryable error', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ code: 'unavailable' })
      .mockResolvedValueOnce({ data: 'test' })

    const promise = firestoreOperation(fn, {
      operation: 'Test',
      timeout: 5000,
      maxAttempts: 3
    })

    await vi.advanceTimersByTimeAsync(10000)

    const result = await promise
    expect(result).toEqual({ data: 'test' })
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('getFirebaseErrorMessage', () => {
  it('should return appropriate message for Firebase error codes', () => {
    Object.keys(FirebaseErrorMessages).forEach(code => {
      const message = getFirebaseErrorMessage({ code })
      expect(message).toBe(FirebaseErrorMessages[code])
    })
  })

  it('should return network error message for network errors', () => {
    expect(getFirebaseErrorMessage({ message: 'network error' })).toContain('Network')
    expect(getFirebaseErrorMessage({ message: 'Network failed' })).toContain('Network')
  })

  it('should return timeout message for timeout errors', () => {
    expect(getFirebaseErrorMessage({ message: 'Operation timed out' })).toContain('took too long')
  })

  it('should return default message for unknown errors', () => {
    expect(getFirebaseErrorMessage({ message: 'Unknown error' })).toBe('An error occurred. Please try again.')
    expect(getFirebaseErrorMessage(null)).toBe('An error occurred.')
    expect(getFirebaseErrorMessage(undefined)).toBe('An error occurred.')
  })

  it('should handle specific error codes', () => {
    expect(getFirebaseErrorMessage({ code: 'permission-denied' })).toContain('permission')
    expect(getFirebaseErrorMessage({ code: 'unauthenticated' })).toContain('session')
    expect(getFirebaseErrorMessage({ code: 'not-found' })).toContain('not found')
  })
})

describe('FirebaseErrorMessages', () => {
  it('should have messages for common error codes', () => {
    const expectedCodes = [
      'permission-denied',
      'not-found',
      'already-exists',
      'resource-exhausted',
      'failed-precondition',
      'aborted',
      'out-of-range',
      'unimplemented',
      'internal',
      'unavailable',
      'data-loss',
      'unauthenticated',
      'deadline-exceeded',
      'cancelled',
      'unknown'
    ]

    expectedCodes.forEach(code => {
      expect(FirebaseErrorMessages[code]).toBeDefined()
      expect(typeof FirebaseErrorMessages[code]).toBe('string')
    })
  })
})
