import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    // VALIDATION: Check all required fields
    if (!displayName.trim()) {
      toast.error('Name is required')
      setErrors({ displayName: 'Name is required' })
      return
    }

    if (!email.trim()) {
      toast.error('Email is required')
      setErrors({ email: 'Email is required' })
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      setErrors({ password: 'Password must be at least 6 characters' })
      return
    }

    // PASSWORD MATCH VALIDATION - CRITICAL FIX
    if (password !== passwordConfirm) {
      toast.error("Passwords don't match!")
      setErrors({ passwordConfirm: "Passwords don't match" })
      return
    }

    setLoading(true)

    try {
      await signup(email, password, displayName.trim())
      toast.success('Account created successfully! Welcome to Cosmos 🎉')
      navigate('/')
    } catch (err) {
      console.error('Signup error:', err)
      
      let errorMessage = 'Failed to create account'
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Please try logging in.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak'
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">
            Join Cosmos
          </h2>
          <p className="text-zinc-400 text-center mb-8">
            Start your learning journey today
          </p>

          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={`w-full px-4 py-3 bg-night-800 border ${
                  errors.displayName ? 'border-red-500' : 'border-white/10'
                } rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
                placeholder="Enter your name"
                disabled={loading}
                required
              />
              {errors.displayName && (
                <p className="text-red-400 text-sm mt-1">{errors.displayName}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email <span className="text-red-400">*</span>
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
                required
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
                Password <span className="text-red-400">*</span>
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
                required
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-zinc-500 mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-zinc-300 mb-2">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={`w-full px-4 py-3 bg-night-800 border ${
                  errors.passwordConfirm ? 'border-red-500' : 'border-white/10'
                } rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500`}
                placeholder="••••••••"
                disabled={loading}
                required
              />
              {errors.passwordConfirm && (
                <p className="text-red-400 text-sm mt-1">{errors.passwordConfirm}</p>
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
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <p className="text-zinc-400 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
