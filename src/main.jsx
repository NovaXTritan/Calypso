import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './styles.css'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import NavBar from './components/NavBar'
import Footer from './components/Footer'
import CursorRing from './components/CursorRing'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ErrorBoundary from './components/ErrorBoundary'
import toast from 'react-hot-toast'


// Lazy loaded pages
const Pods = lazy(() => import('./pages/Pods'))
const PodForum = lazy(() => import('./pages/PodForum'))
const Matches = lazy(() => import('./pages/Matches'))
const Journal = lazy(() => import('./pages/Journal'))
const Events = lazy(() => import('./pages/Events'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Constitution = lazy(() => import('./pages/Constitution'))  // ← ADDED

function App(){
  return (
    <div className="min-h-screen flex flex-col grain">
      <CursorRing />
      <NavBar />
      <main id="content" className="flex-1">
        <Suspense fallback={<div className="p-8 text-zinc-400">Loading…</div>}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/constitution" element={<Constitution />} />  {/* ← ADDED - Public page */}
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/pods" element={<ProtectedRoute><Pods /></ProtectedRoute>} />
            <Route path="/pods/:slug" element={<ProtectedRoute><PodForum /></ProtectedRoute>} />
            <Route path="/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
            <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>                              {/* ← ADDED - Wraps everything */}
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>                             {/* ← ADDED */}
  </React.StrictMode>
)

// Keep service worker if you have one (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/cosmos/sw.js').catch(() => {})
  })
}
