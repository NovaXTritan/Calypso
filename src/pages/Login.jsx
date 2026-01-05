import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { validateData, loginSchema } from '../utils/security'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import SEO from '../components/SEO'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

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
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
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
    </div>
  )
}

