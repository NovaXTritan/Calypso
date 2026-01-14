import React, { Suspense, lazy, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HelmetProvider } from 'react-helmet-async'
import './styles.css'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CelebrationProvider } from './contexts/CelebrationContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import NavBar from './components/NavBar'
import CelebrationOverlay from './components/CelebrationOverlay'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'
import CursorRing from './components/CursorRing'
import StreakReminder from './components/StreakReminder'
import useIsTouchDevice from './hooks/useIsTouchDevice'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'


// Lazy loaded pages
const Pods = lazy(() => import('./pages/Pods'))
const PodForum = lazy(() => import('./pages/PodForum'))
const NewThread = lazy(() => import('./pages/NewThread'))
const ThreadView = lazy(() => import('./pages/ThreadView'))
const Matches = lazy(() => import('./pages/Matches'))
const Journal = lazy(() => import('./pages/Journal'))
const Events = lazy(() => import('./pages/Events'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Constitution = lazy(() => import('./pages/Constitution'))
const Chat = lazy(() => import('./pages/Chat'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))

// Page transition variants - desktop
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
}

// Simpler/faster variants for mobile
const mobilePageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
      </div>
    </div>
  )
}

// Animated page wrapper - uses simpler animations on mobile
function AnimatedPage({ children }) {
  const isMobile = useIsTouchDevice()

  const variants = useMemo(() =>
    isMobile ? mobilePageVariants : pageVariants,
    [isMobile]
  )

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: isMobile ? 0.1 : 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function AppContent() {
  const location = useLocation()
  const { currentUser } = useAuth()

  return (
    <div className="min-h-screen flex flex-col grain">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <CursorRing />
      <NavBar />
      {currentUser && <StreakReminder />}
      <main id="main-content" role="main" aria-label="Main content" className={`flex-1 ${currentUser ? 'pb-20 md:pb-0' : ''}`}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes location={location} key={location.pathname}>
              {/* Public routes */}
              <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
              <Route path="/signup" element={<AnimatedPage><Signup /></AnimatedPage>} />
              <Route path="/constitution" element={<AnimatedPage><Constitution /></AnimatedPage>} />

              {/* Home route - public (handles auth check internally) */}
              <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />

              {/* Protected routes */}
              <Route path="/pods" element={<ProtectedRoute><AnimatedPage><Pods /></AnimatedPage></ProtectedRoute>} />
              <Route path="/pods/:slug" element={<ProtectedRoute><AnimatedPage><PodForum /></AnimatedPage></ProtectedRoute>} />
              <Route path="/pods/:slug/new-thread" element={<ProtectedRoute><AnimatedPage><NewThread /></AnimatedPage></ProtectedRoute>} />
              <Route path="/pods/:slug/thread/:threadId" element={<ProtectedRoute><AnimatedPage><ThreadView /></AnimatedPage></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><AnimatedPage><Leaderboard /></AnimatedPage></ProtectedRoute>} />
              <Route path="/matches" element={<ProtectedRoute><AnimatedPage><Matches /></AnimatedPage></ProtectedRoute>} />
              <Route path="/journal" element={<ProtectedRoute><AnimatedPage><Journal /></AnimatedPage></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><AnimatedPage><Events /></AnimatedPage></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnimatedPage><Analytics /></AnimatedPage></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><AnimatedPage><Profile /></AnimatedPage></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AnimatedPage><Settings /></AnimatedPage></ProtectedRoute>} />
              <Route path="/chat/:chatId" element={<ProtectedRoute><AnimatedPage><Chat /></AnimatedPage></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
      <Footer />
      {currentUser && <BottomNav />}
    </div>
  )
}

function App(){
  return (
    <>
      <CelebrationOverlay />
      <AppContent />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a2340',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#667dff',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <CelebrationProvider>
              <App />
            </CelebrationProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
)

// Keep service worker if you have one (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/cosmos/sw.js').catch(() => {})
  })
}
