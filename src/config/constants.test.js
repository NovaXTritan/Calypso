// src/config/constants.test.js - Tests for configuration constants
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to test the isModerator function behavior
// Since MODERATOR_EMAILS is computed at import time, we test the logic directly

describe('isModerator', () => {
  it('should return false for null or undefined email', async () => {
    // Dynamic import to get fresh module
    const { isModerator } = await import('./constants')

    expect(isModerator(null)).toBe(false)
    expect(isModerator(undefined)).toBe(false)
  })

  it('should return false for non-string email', async () => {
    const { isModerator } = await import('./constants')

    expect(isModerator(123)).toBe(false)
    expect(isModerator({})).toBe(false)
    expect(isModerator([])).toBe(false)
  })

  it('should handle case-insensitive comparison', async () => {
    // This test verifies the toLowerCase() call in isModerator
    const { isModerator, MODERATOR_EMAILS } = await import('./constants')

    // If there are any moderator emails configured, test case insensitivity
    if (MODERATOR_EMAILS.length > 0) {
      const testEmail = MODERATOR_EMAILS[0]
      expect(isModerator(testEmail.toUpperCase())).toBe(true)
      expect(isModerator(testEmail.toLowerCase())).toBe(true)
    }
  })

  it('should return false for empty moderator list', async () => {
    const { isModerator, MODERATOR_EMAILS } = await import('./constants')

    // If no moderators are configured (env var not set), should return false
    if (MODERATOR_EMAILS.length === 0) {
      expect(isModerator('any@email.com')).toBe(false)
    }
  })
})

describe('Pod utilities', () => {
  it('should have PODS_DATA with required properties', async () => {
    const { PODS_DATA } = await import('./constants')

    expect(Array.isArray(PODS_DATA)).toBe(true)
    expect(PODS_DATA.length).toBeGreaterThan(0)

    PODS_DATA.forEach(pod => {
      expect(pod).toHaveProperty('slug')
      expect(pod).toHaveProperty('name')
      expect(pod).toHaveProperty('description')
      expect(typeof pod.slug).toBe('string')
      expect(typeof pod.name).toBe('string')
      expect(typeof pod.description).toBe('string')
    })
  })

  it('should have unique slugs', async () => {
    const { PODS_DATA } = await import('./constants')

    const slugs = PODS_DATA.map(p => p.slug)
    const uniqueSlugs = [...new Set(slugs)]

    expect(slugs.length).toBe(uniqueSlugs.length)
  })

  it('getPodBySlug should return pod data for valid slug', async () => {
    const { getPodBySlug, PODS_DATA } = await import('./constants')

    const testPod = PODS_DATA[0]
    const result = getPodBySlug(testPod.slug)

    expect(result).toEqual(testPod)
  })

  it('getPodBySlug should return null for invalid slug', async () => {
    const { getPodBySlug } = await import('./constants')

    expect(getPodBySlug('non-existent-pod')).toBeNull()
    expect(getPodBySlug(null)).toBeNull()
    expect(getPodBySlug(undefined)).toBeNull()
  })

  it('slugify should convert names to URL-friendly slugs', async () => {
    const { slugify } = await import('./constants')

    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('AI & ML')).toBe('ai-ml')
    expect(slugify('UX/UI Design')).toBe('ux-ui-design')
    expect(slugify('Test  123')).toBe('test-123')
    expect(slugify('--Leading-Trailing--')).toBe('leading-trailing')
  })

  it('slugify should handle invalid input', async () => {
    const { slugify } = await import('./constants')

    expect(slugify('')).toBe('')
    expect(slugify(null)).toBe('')
    expect(slugify(undefined)).toBe('')
    expect(slugify(123)).toBe('')
  })

  it('getAllPodSlugs should return all slugs', async () => {
    const { getAllPodSlugs, PODS_DATA } = await import('./constants')

    const slugs = getAllPodSlugs()

    expect(Array.isArray(slugs)).toBe(true)
    expect(slugs.length).toBe(PODS_DATA.length)
    expect(slugs).toEqual(PODS_DATA.map(p => p.slug))
  })

  it('getAllPodNames should return all names', async () => {
    const { getAllPodNames, PODS_DATA } = await import('./constants')

    const names = getAllPodNames()

    expect(Array.isArray(names)).toBe(true)
    expect(names.length).toBe(PODS_DATA.length)
    expect(names).toEqual(PODS_DATA.map(p => p.name))
  })
})
