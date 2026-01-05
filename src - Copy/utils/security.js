// src/utils/security.js - Security and Validation Utilities

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
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
}

/**
 * Sanitize array of strings
 */
export function sanitizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => sanitizeText(item)).filter(Boolean);
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
 */
export const passwordSchema = z.object({
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
  
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Journal Entry Validation Schema
 */
export const journalSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  
  mood: z.enum(['Calm', 'Focused', 'Stressed', 'Anxious', 'Happy', 'Tired'], {
    errorMap: () => ({ message: 'Please select a mood' })
  }),
  
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([])
});

/**
 * Signup Validation Schema
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
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
  
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
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
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

// Example 3: Password validation
const passwordData = {
  password: '123456',
  confirmPassword: '123456'
};
const valid = isValid(passwordSchema, passwordData);
// Returns: true

// Example 4: Debounce API call
import { debounce } from './security';
const debouncedSave = debounce(async () => {
  await saveToFirestore();
}, 500); // Wait 500ms after last keystroke
*/
