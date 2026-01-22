import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/Calypso/' : '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Firebase (largest dependency)
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          // UI/Animation libraries
          'vendor-ui': ['framer-motion', 'lucide-react', 'react-hot-toast'],
          // Data visualization (only loaded on Analytics page)
          'vendor-charts': ['recharts'],
          // Utilities
          'vendor-utils': ['zustand', 'zod', 'dompurify', 'lodash.debounce'],
          // THREE.JS - separate chunk (lazy loaded via BlackHoleCanvas)
          'vendor-three': ['three'],
        }
      }
    },
    // Increase warning limit since we're code-splitting intentionally
    chunkSizeWarningLimit: 600,
    // Report compressed sizes
    reportCompressedSize: true,
    // Target modern browsers
    target: 'es2020',
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
    // Exclude Three.js from initial optimization (lazy loaded)
    exclude: ['three']
  }
})