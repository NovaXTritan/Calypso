// src/test/setup.js - Vitest test setup
import '@testing-library/jest-dom'

// Mock import.meta.env for tests
if (typeof import.meta.env === 'undefined') {
  globalThis.import = {
    meta: {
      env: {
        VITE_FIREBASE_API_KEY: 'test-api-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'test-project',
        VITE_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
        VITE_FIREBASE_APP_ID: 'test-app-id',
        VITE_MODERATOR_EMAILS: 'admin@test.com,mod@test.com'
      }
    }
  }
}

// Mock matchMedia for tests that need it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() { return null }
  unobserve() { return null }
  disconnect() { return null }
}

window.IntersectionObserver = MockIntersectionObserver

// Mock ResizeObserver
class MockResizeObserver {
  observe() { return null }
  unobserve() { return null }
  disconnect() { return null }
}

window.ResizeObserver = MockResizeObserver

// Suppress console errors in tests (optional - comment out for debugging)
// vi.spyOn(console, 'error').mockImplementation(() => {})
// vi.spyOn(console, 'warn').mockImplementation(() => {})
