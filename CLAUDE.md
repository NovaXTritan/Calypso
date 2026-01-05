# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cosmos is a peer learning platform ("PeerLearn") built with React + Vite. It features a three.js black-hole visualization, Firebase backend (Auth, Firestore, Storage), and a pod-based community forum system.

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start Vite dev server
npm run build  # Production build
npm run preview # Preview production build
```

## Architecture

### State Management
- **Zustand stores** (not Redux):
  - `src/store.js` - UI state (reduced motion preferences)
  - `src/storeForum.js` - Forum state (pods, threads, posts, membership) with localStorage persistence and Firebase sync

### Authentication
- `src/contexts/AuthContext.jsx` - React context providing Firebase Auth with Firestore user profiles
- `src/components/auth/ProtectedRoute.jsx` - Route wrapper requiring authentication
- Auth state syncs pod membership between `AuthContext` and `useForum` store

### Firebase Setup
- Config in `src/lib/firebase.js` using `VITE_FIREBASE_*` env vars
- Exports: `auth`, `db` (Firestore), `storage`
- User documents stored in `users` collection with schema: `uid, email, displayName, photoURL, bio, goals[], joinedPods[], streak, totalProofs, preferences{}`

### Routing
- Uses `HashRouter` (for GitHub Pages compatibility)
- Public routes: `/login`, `/signup`, `/constitution`
- Protected routes: `/`, `/pods`, `/pods/:slug`, `/matches`, `/journal`, `/events`, `/analytics`, `/profile`, `/settings`
- Pages lazy-loaded except Home, Login, Signup

### Visual Components
- `BlackHoleCanvas.jsx` - Three.js animated black hole with:
  - Mouse parallax (`useMouseParallax`)
  - Visibility-aware rendering (`useVisibility`)
  - Reduced motion support (`usePrefersReducedMotion`)
  - WebGL fallback to CSS gradient
- `CursorRing.jsx` - Custom cursor effect

### Pod System
- Pods defined in `src/podsData.js` (static list with slugify helper)
- Forum data persisted to `localStorage` key `cosmos_forum_v1`
- Pod membership synced to Firebase `users.joinedPods[]`

### Security
- `src/utils/security.js` provides:
  - `sanitizeText()` / `sanitizeHTML()` - DOMPurify wrappers for XSS prevention
  - Zod schemas: `profileSchema`, `signupSchema`, `loginSchema`, `journalSchema`
  - `validateData(schema, data)` - Returns `{success, errors, data}`

## Styling

- Tailwind CSS with custom theme in `tailwind.config.js`:
  - Colors: `night.*` (dark backgrounds), `brand.*` (accent blues), `glow.*` (warm oranges)
  - Shadows: `glass`, `neon`
- Global styles in `src/styles.css`
- Glassmorphism pattern used throughout

## Environment Variables

Required in `.env`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Deployment

Configured for GitHub Pages using GitHub Actions. Repo name `cosmos` is assumed; change `base` in `vite.config.js` if different.
