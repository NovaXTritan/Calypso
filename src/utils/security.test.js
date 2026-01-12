// src/utils/security.test.js - Tests for security utilities
import { describe, it, expect } from 'vitest'
import {
  sanitizeText,
  sanitizeHTML,
  sanitizeArray,
  validateData,
  isValid,
  getPasswordStrength,
  profileSchema,
  emailSchema,
  passwordSchema,
  journalSchema,
  signupSchema,
  loginSchema
} from './security'

describe('sanitizeText', () => {
  it('should remove HTML tags from text', () => {
    expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('Hello')
  })

  it('should handle empty input', () => {
    expect(sanitizeText('')).toBe('')
    expect(sanitizeText(null)).toBe('')
    expect(sanitizeText(undefined)).toBe('')
  })

  it('should handle non-string input', () => {
    expect(sanitizeText(123)).toBe('')
    expect(sanitizeText({})).toBe('')
    expect(sanitizeText([])).toBe('')
  })

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello world  ')).toBe('hello world')
  })

  it('should remove all HTML including nested', () => {
    expect(sanitizeText('<div><p>Text</p></div>')).toBe('Text')
  })

  it('should handle XSS attack vectors', () => {
    // Event handlers
    expect(sanitizeText('<img src="x" onerror="alert(1)">')).toBe('')

    // JavaScript URLs
    expect(sanitizeText('<a href="javascript:alert(1)">Click</a>')).toBe('Click')

    // Data URLs
    expect(sanitizeText('<img src="data:text/html,<script>alert(1)</script>">')).toBe('')

    // SVG with scripts
    expect(sanitizeText('<svg onload="alert(1)">')).toBe('')
  })

  it('should preserve normal text content', () => {
    expect(sanitizeText('Hello, World!')).toBe('Hello, World!')
    expect(sanitizeText('Test 123 @#$%')).toBe('Test 123 @#$%')
  })
})

describe('sanitizeHTML', () => {
  it('should allow safe HTML tags', () => {
    expect(sanitizeHTML('<b>Bold</b>')).toBe('<b>Bold</b>')
    expect(sanitizeHTML('<i>Italic</i>')).toBe('<i>Italic</i>')
    expect(sanitizeHTML('<em>Emphasis</em>')).toBe('<em>Emphasis</em>')
    expect(sanitizeHTML('<strong>Strong</strong>')).toBe('<strong>Strong</strong>')
    expect(sanitizeHTML('<p>Paragraph</p>')).toBe('<p>Paragraph</p>')
    expect(sanitizeHTML('<br>')).toContain('br')
  })

  it('should allow safe attributes', () => {
    expect(sanitizeHTML('<a href="https://example.com">Link</a>')).toBe('<a href="https://example.com">Link</a>')
    expect(sanitizeHTML('<a href="https://example.com" target="_blank">Link</a>')).toBe('<a href="https://example.com" target="_blank">Link</a>')
  })

  it('should remove unsafe tags', () => {
    expect(sanitizeHTML('<script>alert(1)</script>')).toBe('')
    expect(sanitizeHTML('<iframe src="evil.com"></iframe>')).toBe('')
    expect(sanitizeHTML('<div>Content</div>')).toBe('Content')
  })

  it('should handle empty input', () => {
    expect(sanitizeHTML('')).toBe('')
    expect(sanitizeHTML(null)).toBe('')
    expect(sanitizeHTML(undefined)).toBe('')
  })
})

describe('sanitizeArray', () => {
  it('should sanitize all array items', () => {
    const input = ['<script>bad</script>Hello', 'Normal', '<b>Bold</b>World']
    const result = sanitizeArray(input)
    expect(result).toEqual(['Hello', 'Normal', 'BoldWorld'])
  })

  it('should filter out empty strings after sanitization', () => {
    const input = ['<script></script>', 'Valid', '']
    const result = sanitizeArray(input)
    expect(result).toEqual(['Valid'])
  })

  it('should handle empty array', () => {
    expect(sanitizeArray([])).toEqual([])
  })

  it('should handle non-array input', () => {
    expect(sanitizeArray(null)).toEqual([])
    expect(sanitizeArray(undefined)).toEqual([])
    expect(sanitizeArray('string')).toEqual([])
    expect(sanitizeArray(123)).toEqual([])
  })
})

describe('profileSchema', () => {
  it('should validate valid profile data', () => {
    const validProfile = {
      displayName: 'John Doe',
      bio: 'A software developer',
      goals: ['Learn React', 'Master TypeScript']
    }
    const result = validateData(profileSchema, validProfile)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(validProfile)
  })

  it('should reject empty display name', () => {
    const result = validateData(profileSchema, { displayName: '' })
    expect(result.success).toBe(false)
    expect(result.errors.displayName).toBeDefined()
  })

  it('should reject display name that is only whitespace', () => {
    const result = validateData(profileSchema, { displayName: '   ' })
    expect(result.success).toBe(false)
  })

  it('should reject display name over 100 characters', () => {
    const result = validateData(profileSchema, { displayName: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('should reject bio over 500 characters', () => {
    const result = validateData(profileSchema, {
      displayName: 'John',
      bio: 'a'.repeat(501)
    })
    expect(result.success).toBe(false)
  })

  it('should reject more than 10 goals', () => {
    const result = validateData(profileSchema, {
      displayName: 'John',
      goals: Array(11).fill('Goal')
    })
    expect(result.success).toBe(false)
  })

  it('should allow optional fields', () => {
    const result = validateData(profileSchema, { displayName: 'John' })
    expect(result.success).toBe(true)
    expect(result.data.bio).toBe('')
    expect(result.data.goals).toEqual([])
  })
})

describe('emailSchema', () => {
  it('should validate valid email', () => {
    const result = validateData(emailSchema, { email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email format', () => {
    expect(validateData(emailSchema, { email: 'invalid' }).success).toBe(false)
    expect(validateData(emailSchema, { email: 'test@' }).success).toBe(false)
    expect(validateData(emailSchema, { email: '@example.com' }).success).toBe(false)
  })

  it('should reject empty email', () => {
    const result = validateData(emailSchema, { email: '' })
    expect(result.success).toBe(false)
  })
})

describe('passwordSchema', () => {
  it('should validate strong password', () => {
    const result = validateData(passwordSchema, {
      password: 'StrongPass1!',
      confirmPassword: 'StrongPass1!'
    })
    expect(result.success).toBe(true)
  })

  it('should reject password without uppercase', () => {
    const result = validateData(passwordSchema, {
      password: 'weakpass1!',
      confirmPassword: 'weakpass1!'
    })
    expect(result.success).toBe(false)
  })

  it('should reject password without lowercase', () => {
    const result = validateData(passwordSchema, {
      password: 'WEAKPASS1!',
      confirmPassword: 'WEAKPASS1!'
    })
    expect(result.success).toBe(false)
  })

  it('should reject password without number', () => {
    const result = validateData(passwordSchema, {
      password: 'WeakPass!',
      confirmPassword: 'WeakPass!'
    })
    expect(result.success).toBe(false)
  })

  it('should reject password without special character', () => {
    const result = validateData(passwordSchema, {
      password: 'WeakPass1',
      confirmPassword: 'WeakPass1'
    })
    expect(result.success).toBe(false)
  })

  it('should reject password shorter than 8 characters', () => {
    const result = validateData(passwordSchema, {
      password: 'Sh0rt!',
      confirmPassword: 'Sh0rt!'
    })
    expect(result.success).toBe(false)
  })

  it('should reject mismatched passwords', () => {
    const result = validateData(passwordSchema, {
      password: 'StrongPass1!',
      confirmPassword: 'DifferentPass1!'
    })
    expect(result.success).toBe(false)
    expect(result.errors.confirmPassword).toBeDefined()
  })
})

describe('getPasswordStrength', () => {
  it('should return score 0 for empty password', () => {
    expect(getPasswordStrength('').score).toBe(0)
    expect(getPasswordStrength(null).score).toBe(0)
    expect(getPasswordStrength(undefined).score).toBe(0)
  })

  it('should return low score for weak passwords', () => {
    expect(getPasswordStrength('123').score).toBeLessThan(2)
    expect(getPasswordStrength('password').score).toBeLessThan(3)
  })

  it('should return high score for strong passwords', () => {
    expect(getPasswordStrength('StrongPass123!').score).toBeGreaterThanOrEqual(4)
  })

  it('should increase score for length', () => {
    const short = getPasswordStrength('Ab1!').score
    const medium = getPasswordStrength('AbCdEf1!').score
    const long = getPasswordStrength('AbCdEfGhIj1!').score
    expect(medium).toBeGreaterThan(short)
    // Long password hits max score (4), same as medium with all criteria
    expect(long).toBeGreaterThanOrEqual(medium)
  })

  it('should return appropriate labels', () => {
    expect(getPasswordStrength('').label).toBe('None')
    expect(getPasswordStrength('StrongPass123!').label).toBe('Very Strong')
  })
})

describe('journalSchema', () => {
  it('should validate valid journal entry', () => {
    const result = validateData(journalSchema, {
      content: 'Today was productive',
      mood: 'Happy',
      tags: ['work', 'coding']
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty content', () => {
    const result = validateData(journalSchema, {
      content: '',
      mood: 'Happy'
    })
    expect(result.success).toBe(false)
  })

  it('should reject content over 5000 characters', () => {
    const result = validateData(journalSchema, {
      content: 'a'.repeat(5001),
      mood: 'Happy'
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid mood', () => {
    const result = validateData(journalSchema, {
      content: 'Test content',
      mood: 'InvalidMood'
    })
    expect(result.success).toBe(false)
  })

  it('should accept all valid moods', () => {
    const validMoods = ['Calm', 'Focused', 'Stressed', 'Anxious', 'Happy', 'Tired']
    validMoods.forEach(mood => {
      const result = validateData(journalSchema, { content: 'Test', mood })
      expect(result.success).toBe(true)
    })
  })

  it('should reject more than 10 tags', () => {
    const result = validateData(journalSchema, {
      content: 'Test',
      mood: 'Happy',
      tags: Array(11).fill('tag')
    })
    expect(result.success).toBe(false)
  })
})

describe('signupSchema', () => {
  it('should validate valid signup data', () => {
    const result = validateData(signupSchema, {
      displayName: 'John Doe',
      email: 'john@example.com',
      password: 'StrongPass1!',
      passwordConfirm: 'StrongPass1!'
    })
    expect(result.success).toBe(true)
  })

  it('should reject mismatched passwords', () => {
    const result = validateData(signupSchema, {
      displayName: 'John Doe',
      email: 'john@example.com',
      password: 'StrongPass1!',
      passwordConfirm: 'DifferentPass1!'
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('should validate valid login data', () => {
    const result = validateData(loginSchema, {
      email: 'test@example.com',
      password: 'anypassword'
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty password', () => {
    const result = validateData(loginSchema, {
      email: 'test@example.com',
      password: ''
    })
    expect(result.success).toBe(false)
  })
})

describe('isValid', () => {
  it('should return true for valid data', () => {
    expect(isValid(emailSchema, { email: 'test@example.com' })).toBe(true)
  })

  it('should return false for invalid data', () => {
    expect(isValid(emailSchema, { email: 'invalid' })).toBe(false)
  })
})

describe('validateData', () => {
  it('should return errors object on validation failure', () => {
    const result = validateData(profileSchema, { displayName: '' })
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(typeof result.errors).toBe('object')
  })

  it('should return validated data on success', () => {
    const result = validateData(profileSchema, { displayName: 'John' })
    expect(result.success).toBe(true)
    expect(result.data.displayName).toBe('John')
  })
})
