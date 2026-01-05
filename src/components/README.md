# Cosmos Components

## Directory Structure

```
components/
├── ui/                    # Reusable UI primitives
│   └── Loading.jsx        # Loading spinners, skeletons
├── auth/                  # Authentication components
│   └── ProtectedRoute.jsx # Route wrapper requiring auth
├── Avatar.jsx             # User avatar with fallback
├── BlackHoleCanvas.jsx    # Hero 3D visualization (lazy loads Three.js)
├── BlackHoleThree.jsx     # Three.js implementation (code-split)
├── BottomNav.jsx          # Mobile navigation bar
├── Composer.jsx           # Post creation form
├── CursorRing.jsx         # Custom cursor effect
├── ErrorBoundary.jsx      # Error catching wrapper
├── NavBar.jsx             # Desktop navigation
├── OfflineIndicator.jsx   # Offline status banner
└── ProofCard.jsx          # Post/proof display card
```

## Key Patterns

### Loading States

Use components from `ui/Loading.jsx`:

```jsx
import { LoadingSpinner, PageLoading, SkeletonCard } from './ui/Loading'

// Full page loading
<PageLoading />

// Inline spinner
<LoadingSpinner size="md" />

// Skeleton placeholder
<SkeletonCard />
```

### Error Handling

All error logging uses `trackError` from `utils/errorTracking.js`:

```jsx
import { trackError, ErrorCategory } from '../utils/errorTracking'

try {
  await someOperation()
} catch (error) {
  trackError(error, { action: 'operationName' }, 'error', ErrorCategory.FIRESTORE)
}
```

### Accessibility

- All interactive elements have `aria-label` attributes
- Navigation uses `aria-current="page"` for active state
- Buttons have clear labels for screen readers

### Performance

- `BlackHoleCanvas.jsx` lazy loads Three.js (~470KB) only when needed
- WebGL support is checked before loading 3D content
- CSS gradient fallback for unsupported browsers

## Component Guidelines

1. **Use existing utilities** - Check `utils/security.js` for sanitization
2. **Track errors** - Replace `console.error` with `trackError`
3. **Handle loading states** - Use `ui/Loading.jsx` components
4. **Validate inputs** - Use Zod schemas from `utils/security.js`
