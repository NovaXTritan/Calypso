// src/utils/security.js - Security and Validation Utilities
// ENHANCED VERSION - Merges existing functions with new security features

import DOMPurify from 'dompurify';
import { z } from 'zod';

// ============================================
// XSS PROTECTION - SANITIZE ALL USER INPUT
// ============================================

/**
 * Sanitize text input to prevent XSS attacks
 * Use this for ALL user-generated content before saving to Firestore
 */
export function sanitizeText(input) {
  if (!input || typeof input !== 'string') return '';

  // Remove all HTML tags and scripts
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML allowed
    ALLOWED_ATTR: []
  });

  // Trim whitespace
  return clean.trim();
}

/**
 * Sanitize HTML content (for rich text editors)
 * Allows safe HTML tags only
 */
export function sanitizeHTML(input) {
  if (!input || typeof input !== 'string') return '';

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ADD_ATTR: ['target'], // Allow target attribute
    FORBID_ATTR: ['style', 'onclick', 'onerror'], // Explicitly forbid dangerous attrs
  });
}

/**
 * Strip all HTML tags completely
 */
export function stripHTML(input) {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeURL(url) {
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Ensure URL starts with http:// or https:// or is relative
  if (!trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('/') &&
      !trimmed.startsWith('#')) {
    // Prepend https:// if no protocol
    return 'https://' + trimmed;
  }

  return trimmed;
}

/**
 * Sanitize array of strings
 */
export function sanitizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => sanitizeText(item)).filter(Boolean);
}

/**
 * Sanitize user input for display (not storage)
 * Lighter sanitization for rendering
 */
export function sanitizeForDisplay(input) {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: []
  });
}

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

/**
 * User Profile Validation Schema
 */
export const profileSchema = z.object({
  displayName: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .refine(name => name.trim().length > 0, 'Name cannot be empty'),

  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .default(''),

  goals: z.array(z.string())
    .max(10, 'Maximum 10 goals allowed')
    .optional()
    .default([]),
});

/**
 * Email Validation Schema
 */
export const emailSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required')
});

/**
 * Password Validation Schema
 * Requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (!@#$%^&*)'),

  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Check password strength (returns score 0-4)
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'None', color: 'zinc' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['red', 'orange', 'yellow', 'green', 'emerald'];

  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)]
  };
}

/**
 * Journal Entry Validation Schema
 * Adapted for your mood options
 */
export const journalSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),

  mood: z.enum(['Calm', 'Focused', 'Stressed', 'Anxious', 'Happy', 'Tired', 'Motivated', 'Grateful'], {
    errorMap: () => ({ message: 'Please select a mood' })
  }),

  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([])
});

/**
 * Proof Validation Schema - Adapted for your schema
 */
export const proofSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(2000, 'Content must be less than 2000 characters'),

  type: z.enum(['text', 'link', 'image'], {
    errorMap: () => ({ message: 'Invalid proof type' })
  }),

  visibility: z.enum(['public', 'private'], {
    errorMap: () => ({ message: 'Invalid visibility setting' })
  }).default('public'),

  podSlug: z.string()
    .min(1, 'Pod is required')
    .max(100, 'Invalid pod'),
});

/**
 * Thread Validation Schema
 */
export const threadSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),

  content: z.string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be less than 10000 characters'),

  podSlug: z.string()
    .min(1, 'Pod is required')
});

/**
 * Reply Validation Schema
 */
export const replySchema = z.object({
  content: z.string()
    .min(1, 'Reply cannot be empty')
    .max(5000, 'Reply must be less than 5000 characters')
});

/**
 * Message Validation Schema
 */
export const messageSchema = z.object({
  text: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message must be less than 5000 characters')
});

/**
 * Signup Validation Schema
 * Password requires: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const signupSchema = z.object({
  displayName: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .refine(name => name.trim().length > 0, 'Name cannot be empty'),

  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  passwordConfirm: z.string()
}).refine(data => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

/**
 * Login Validation Schema
 */
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(1, 'Email is required'),

  password: z.string()
    .min(1, 'Password is required')
});

// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

/**
 * Validate data against a schema and return errors
 * Returns { success: boolean, errors: object, data: object }
 */
export function validateData(schema, data) {
  try {
    const validated = schema.parse(data);
    return {
      success: true,
      errors: {},
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      // Zod v4 uses .issues instead of .errors
      const issues = error.issues || error.errors || [];
      issues.forEach(err => {
        const path = err.path.join('.');
        errors[path || 'general'] = err.message;
      });
      return {
        success: false,
        errors,
        data: null
      };
    }
    return {
      success: false,
      errors: { general: 'Validation failed' },
      data: null
    };
  }
}

/**
 * Safe validation that returns boolean
 */
export function isValid(schema, data) {
  try {
    schema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// NEW: AUTHENTICATION VERIFICATION
// ============================================

/**
 * Verify auth state and get user ID securely
 * ALWAYS use this instead of accepting userId as a parameter
 * @param {Object} currentUser - The currentUser from useAuth()
 * @returns {string} - The verified user ID
 * @throws {Error} - If not authenticated
 */
export function getVerifiedUserId(currentUser) {
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  if (!currentUser.uid) {
    throw new Error('Invalid user state');
  }
  return currentUser.uid;
}

/**
 * Verify auth state returns boolean
 * @param {Object} currentUser - The currentUser from useAuth()
 * @returns {boolean} - Whether user is authenticated
 */
export function verifyAuthState(currentUser) {
  return !!(currentUser && currentUser.uid);
}

// ============================================
// NEW: RATE LIMITING (CLIENT-SIDE)
// ============================================

// In-memory rate limit store (resets on page reload)
const rateLimitStore = new Map();

/**
 * Check if an action is rate limited
 * @param {string} key - Unique key for the action (e.g., 'proof-{userId}')
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, message?: string }}
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    // First attempt
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  // Check if window has expired
  if (now - record.firstAttempt > windowMs) {
    // Reset window
    rateLimitStore.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  // Within window
  if (record.count >= maxAttempts) {
    const waitTime = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000);
    return {
      allowed: false,
      remaining: 0,
      message: `Too many requests. Please wait ${waitTime} seconds.`
    };
  }

  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);
  return { allowed: true, remaining: maxAttempts - record.count };
}

/**
 * Reset rate limit for a key
 * @param {string} key - The key to reset
 */
export function resetRateLimit(key) {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear();
}

// ============================================
// NEW: PREPARE DATA FOR FIRESTORE
// ============================================

/**
 * Validate and sanitize data before writing to Firestore
 * @param {Object} data - Raw data from user input
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @returns {Object} - Sanitized and validated data ready for Firestore
 * @throws {Error} - If validation fails
 */
export function prepareForFirestore(data, schema) {
  // First validate with schema
  const validation = validateData(schema, data);

  if (!validation.success) {
    const errorMessage = Object.values(validation.errors).join(', ');
    throw new Error(errorMessage || 'Validation failed');
  }

  // Then sanitize all string fields
  const sanitized = {};
  for (const [key, value] of Object.entries(validation.data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Safe user object for display (removes sensitive fields)
 * @param {Object} user - User object from Firestore
 * @returns {Object} - Safe user object for display
 */
export function safeUserForDisplay(user) {
  if (!user) return null;

  const {
    // Remove sensitive fields
    password,
    passwordHash,
    refreshToken,
    accessToken,
    // Keep safe fields
    ...safeFields
  } = user;

  return {
    uid: safeFields.uid || safeFields.id,
    displayName: sanitizeText(safeFields.displayName || 'Anonymous'),
    photoURL: safeFields.photoURL || null,
    bio: sanitizeText(safeFields.bio || ''),
    goals: sanitizeArray(safeFields.goals || []),
    joinedPods: safeFields.joinedPods || [],
    streak: safeFields.streak || 0,
    totalProofs: safeFields.totalProofs || 0,
    createdAt: safeFields.createdAt,
  };
}

// ============================================
// NEW: CONTENT ANALYSIS
// ============================================

/**
 * Analyze content for potential issues
 * @param {string} content - Content to analyze
 * @returns {{ safe: boolean, issues: string[] }}
 */
export function analyzeContent(content) {
  const issues = [];

  if (!content || typeof content !== 'string') {
    return { safe: true, issues: [] };
  }

  // Check for potential script injection
  if (/<script/i.test(content)) {
    issues.push('Contains script tags');
  }

  // Check for event handlers
  if (/on\w+=/i.test(content)) {
    issues.push('Contains event handlers');
  }

  // Check for javascript: URLs
  if (/javascript:/i.test(content)) {
    issues.push('Contains javascript: URL');
  }

  // Check for data: URLs (can be dangerous)
  if (/data:/i.test(content)) {
    issues.push('Contains data: URL');
  }

  // Check for excessive URLs (spam indicator)
  const urlCount = (content.match(/https?:\/\//gi) || []).length;
  if (urlCount > 5) {
    issues.push('Contains many URLs (potential spam)');
  }

  return {
    safe: issues.length === 0,
    issues
  };
}

// ============================================
// DEBOUNCE HELPER
// ============================================

/**
 * Create a debounced function
 * Use this for form inputs and API calls
 */
export { default as debounce } from 'lodash.debounce';

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// Example 1: Sanitize before saving
const userInput = '<script>alert("xss")</script>Hello';
const clean = sanitizeText(userInput);
// Result: "Hello"

// Example 2: Validate profile
const profileData = {
  displayName: 'John Doe',
  bio: 'Developer',
  goals: ['AI', 'Web Dev']
};
const result = validateData(profileSchema, profileData);
if (result.success) {
  // Save result.data to Firestore
} else {
  // Show result.errors to user
}

// Example 3: Secure Firestore write
import { getVerifiedUserId, prepareForFirestore, proofSchema, checkRateLimit } from '../utils/security';

async function createProof(currentUser, proofData) {
  // 1. Verify authentication
  const userId = getVerifiedUserId(currentUser);

  // 2. Check rate limit
  const rateCheck = checkRateLimit(`proof-${userId}`, 5, 60000);
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.message);
  }

  // 3. Validate and sanitize
  const sanitized = prepareForFirestore(proofData, proofSchema);

  // 4. Add to Firestore with verified userId
  await addDoc(collection(db, 'proofs'), {
    authorId: userId, // From auth, not user input
    ...sanitized,
    createdAt: Date.now(),
    createdAtServer: serverTimestamp()
  });
}

// Example 4: Safe URL handling
const userUrl = sanitizeURL('javascript:alert(1)');
// Result: '' (blocked)

const validUrl = sanitizeURL('example.com');
// Result: 'https://example.com' (protocol added)
*/
