# Cosmos Optimization Implementation Guide

This guide explains how to apply the optimizations from the performance audit.

## Quick Wins (Apply Now)

### 1. Three.js Dynamic Loading (Saves 469 KB initial)

Replace the current BlackHoleCanvas with the optimized version:

```bash
# Backup current file
cp src/components/BlackHoleCanvas.jsx src/components/BlackHoleCanvas.backup.jsx

# Apply optimization
cp cosmos-optimizations/BlackHoleCanvas-optimized.jsx src/components/BlackHoleCanvas.jsx
```

This change:
- Defers loading Three.js until the black hole is visible
- Shows a CSS gradient placeholder initially
- Respects reduced motion preferences
- Uses IntersectionObserver for visibility detection

### 2. Vite Config Optimization

Replace vite.config.js with the optimized version:

```bash
# Backup current file
cp vite.config.js vite.config.backup.js

# Apply optimization
cp cosmos-optimizations/vite.config.optimized.js vite.config.js
```

This change:
- Separates Three.js into its own chunk
- Adds production minification with console removal
- Targets ES2020 for smaller output
- Excludes Three.js from initial bundling

### 3. Build and Verify

After applying changes:

```bash
npm run build
```

Expected output:
- Initial bundle should be ~100-150 KB smaller (gzipped)
- vendor-three chunk should appear separately
- BlackHole loads on-demand when scrolled into view

## Already Implemented Optimizations

These optimizations were already applied in the previous session:

### Firestore Query Optimization (20x reduction)

| Page | Before | After |
|------|--------|-------|
| Pods | 2,000 reads | ~35 reads |
| Matches | 1,000 reads | ~50 reads |
| Analytics | 365+ reads | 0 reads (user doc) |
| Profile | 365+ reads | 0 reads (user doc) |

### WebGL Memory Management

BlackHoleThree.jsx already has:
- Proper geometry/material disposal
- Texture cleanup
- Renderer disposal with forceContextLoss()
- RAF cancellation
- Visibility-based pause

### Mobile Performance

Already implemented:
- 30fps cap on mobile devices
- Reduced geometry segments
- Lower pixel ratio
- Simplified animations (opacity only)
- Disabled antialiasing on mobile

### Caching

Already implemented:
- Pod stats cached in localStorage (5 min TTL)
- Forum state persisted to localStorage
- User profile data in AuthContext
- Activity data pre-computed in user doc

## Future Optimizations (If Needed)

### Replace Recharts (Saves ~200 KB)

For lighter charts, consider:
- **@nivo/core** - React-based, smaller footprint
- **visx** - Low-level primitives, very small
- **Chart.js** - Canvas-based, smaller than Recharts

### Service Worker

Add offline support with Workbox:

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    }
  })
]
```

### Firestore Offline Persistence

Enable in firebase.js:

```javascript
import { enableIndexedDbPersistence } from 'firebase/firestore'

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    // Multiple tabs open
  } else if (err.code == 'unimplemented') {
    // Browser doesn't support
  }
})
```

## Verification Checklist

After applying optimizations:

- [ ] Build completes without errors
- [ ] Black hole loads when scrolled into view
- [ ] No console errors about Three.js
- [ ] Mobile performance feels smooth
- [ ] Analytics page charts still work
- [ ] Profile heatmap still displays

## Rollback

If issues occur:

```bash
# Restore BlackHoleCanvas
cp src/components/BlackHoleCanvas.backup.jsx src/components/BlackHoleCanvas.jsx

# Restore vite.config
cp vite.config.backup.js vite.config.js

# Rebuild
npm run build
```
