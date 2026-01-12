// src/utils/safe.js - Safe utility functions for defensive programming

import toast from 'react-hot-toast'

// ============================================
// SAFE TOAST NOTIFICATIONS
// ============================================

/**
 * Safe toast wrapper that won't throw if toast fails
 */
export const safeToast = {
  success: (msg) => {
    try {
      toast.success(msg)
    } catch {
      // Silent fallback in production
    }
  },
  error: (msg) => {
    try {
      toast.error(msg)
    } catch {
      // Silent fallback in production
    }
  },
  loading: (msg) => {
    try {
      return toast.loading(msg)
    } catch {
      return null
    }
  },
  dismiss: (id) => {
    try {
      if (id) toast.dismiss(id)
    } catch {
      // Silent fallback
    }
  }
}

// ============================================
// SAFE STRING OPERATIONS
// ============================================

/**
 * Safely convert value to string with fallback
 */
export const safeString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  try {
    return String(value)
  } catch {
    return fallback
  }
}

/**
 * Safe string slice operation
 */
export const safeSlice = (str, start, end) => {
  try {
    const s = safeString(str)
    return s.slice(start, end)
  } catch {
    return ''
  }
}

/**
 * Safe charAt operation
 */
export const safeCharAt = (str, index) => {
  try {
    const s = safeString(str)
    return s.charAt(index) || ''
  } catch {
    return ''
  }
}

// ============================================
// SAFE ARRAY OPERATIONS
// ============================================

/**
 * Safely ensure value is an array
 */
export const safeArray = (value) => {
  if (Array.isArray(value)) return value
  return []
}

/**
 * Safe array includes check
 */
export const safeIncludes = (arr, value) => {
  try {
    return safeArray(arr).includes(value)
  } catch {
    return false
  }
}

/**
 * Safe array length
 */
export const safeLength = (arr) => {
  try {
    return safeArray(arr).length
  } catch {
    return 0
  }
}

// ============================================
// SAFE NUMBER OPERATIONS
// ============================================

/**
 * Safely convert value to number with fallback
 */
export const safeNumber = (value, fallback = 0) => {
  if (typeof value === 'number' && !isNaN(value)) return value
  const parsed = Number(value)
  return isNaN(parsed) ? fallback : parsed
}
