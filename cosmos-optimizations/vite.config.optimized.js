// vite.config.js - OPTIMIZED VERSION
// Better code splitting with Three.js in separate chunk

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/Calypso/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem - always loaded
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Firebase - core auth needed immediately, Firestore can be deferred
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage'
          ],

          // UI/Animation - used across many pages
          'vendor-ui': ['framer-motion', 'lucide-react', 'react-hot-toast'],

          // Charts - only loaded on Analytics page
          'vendor-charts': ['recharts'],

          // Utilities - small, used everywhere
          'vendor-utils': ['zustand', 'zod', 'dompurify', 'lodash.debounce'],

          // THREE.JS - SEPARATE CHUNK (lazy loaded via BlackHoleCanvas)
          // This is the key optimization - 469 KB deferred
          'vendor-three': ['three'],
        }
      }
    },
    // Increase limit since we're code-splitting intentionally
    chunkSizeWarningLimit: 600,

    // Enable compressed size reporting
    reportCompressedSize: true,

    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,      // Remove console.log in production
        drop_debugger: true,     // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: {
        safari10: true,          // Safari 10/11 support
      },
    },

    // Source maps for production debugging (optional)
    sourcemap: false,

    // Target modern browsers
    target: 'es2020',
  },

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'zustand',
    ],
    // Exclude Three.js from initial optimization (lazy loaded)
    exclude: ['three']
  },

  // Server configuration for development
  server: {
    // Enable HMR
    hmr: true,

    // Open browser on start
    open: true,

    // Compression
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    }
  },

  // Preview server (npm run preview)
  preview: {
    port: 4173,
    strictPort: true,
  }
})
