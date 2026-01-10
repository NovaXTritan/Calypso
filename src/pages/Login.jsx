import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { validateData, loginSchema } from '../utils/security'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import SEO from '../components/SEO'
import { ArrowLeft, Mail } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const { login, resetPassword } = useAuth()
  const navigate = useNavigate()

  async function handleForgotPassword(e) {
    e.preventDefault()

    if (!resetEmail.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setResetLoading(true)
    try {
      await resetPassword(resetEmail.trim().toLowerCase())
      toast.success('Password reset email sent! Check your inbox.')
      setShowForgotPassword(false)
      setResetEmail('')
    } catch (err) {
      trackError(err, { action: 'resetPassword', email: resetEmail }, 'error', ErrorCategory.AUTH)

      let errorMessage = 'Failed to send reset email'
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.'
      }
      toast.error(errorMessage)
    } finally {
      setResetLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    // VALIDATION FIX: Validate inputs
    const validation = validateData(loginSchema, {
      email: email.trim().toLowerCase(),
      password: password
    })

    if (!validation.success) {
      setErrors(validation.errors)
      const firstError = Object.values(validation.errors)[0]
      toast.error(firstError)
      return
    }

    // RACE CONDITION FIX: Disable button during async operation
    setLoading(true)

    try {
      await login(validation.data.email, validation.data.password)
      toast.success('Welcome back! 👋')
      navigate('/')
    } catch (err) {
      trackError(err, { action: 'login', email }, 'error', ErrorCategory.AUTH)

      // Better error messages
      let errorMessage = 'Failed to log in'
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email'
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.'
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setErrors({ general: errorMessage })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <SEO
        title="Log In"
        description="Log in to your Cosmos account to continue your learning journey."
        path="/login"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">
            Welcome Back
          </h2>
          <p className="text-zinc-400 text-center mb-8">
            Log in to continue your learning journey
          </p>

          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 bg-night-800 border ${
                  errors.email ? 'border-red-500' : 'border-white/10'
                } rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
                placeholder="your@email.com"
                disabled={loading}
                autoComplete="email"
                required
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true)
                    setResetEmail(email)
                  }}
                  className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-night-800 border ${
                  errors.password ? 'border-red-500' : 'border-white/10'
                } rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
                required
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          <p className="text-zinc-400 text-center mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md glass-card p-8 rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowForgotPassword(false)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft size={18} />
                Back to login
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-brand-500/20 rounded-lg">
                  <Mail className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Reset Password</h3>
              </div>
              <p className="text-zinc-400 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-zinc-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-night-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="your@email.com"
                    disabled={resetLoading}
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

