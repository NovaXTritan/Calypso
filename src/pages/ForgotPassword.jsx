// ForgotPassword.jsx - Standalone password reset page
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { trackError, ErrorCategory } from '../utils/errorTracking'
import SEO from '../components/SEO'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { resetPassword } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()

    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail) {
      toast.error('Please enter your email address')
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      await resetPassword(trimmedEmail)
      setEmailSent(true)
      toast.success('Password reset email sent!')
    } catch (err) {
      trackError(err, { action: 'resetPassword', email: trimmedEmail }, 'error', ErrorCategory.AUTH)

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
      setLoading(false)
    }
  }

  return (
    <>
      <SEO
        title="Reset Password | Cosmos"
        description="Reset your Cosmos account password"
      />

      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 rounded-2xl">
            <Link
              to="/login"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={18} />
              Back to login
            </Link>

            {emailSent ? (
              // Success State
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Check Your Email</h3>
                <p className="text-zinc-400 mb-6">
                  We've sent a password reset link to <span className="text-white">{email}</span>
                </p>
                <p className="text-sm text-zinc-500 mb-6">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEmailSent(false)
                      setEmail('')
                    }}
                    className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                  >
                    Try Different Email
                  </button>
                  <Link
                    to="/login"
                    className="block w-full py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors text-center"
                  >
                    Return to Login
                  </Link>
                </div>
              </motion.div>
            ) : (
              // Form State
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-brand-500/20 rounded-lg">
                    <Mail className="w-6 h-6 text-brand-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                </div>
                <p className="text-zinc-400 mb-6">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-night-800 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                      placeholder="your@email.com"
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                    />
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
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>

                <p className="text-zinc-400 text-center mt-6 text-sm">
                  Remember your password?{' '}
                  <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}
