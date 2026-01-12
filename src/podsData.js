// src/podsData.js - Backward compatibility layer
// Re-exports from centralized constants for legacy support

import { PODS_DATA, slugify, getAllPodNames } from './config/constants'

// Export pod names as array (legacy format)
export const pods = getAllPodNames()

// Re-export slugify
export { slugify }

// Re-export PODS_DATA for components that need full pod info
export { PODS_DATA }
