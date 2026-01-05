import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db, auth as firebaseAuth } from '../lib/firebase'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { Settings as SettingsIcon, Mail, Lock, Bell, Shield, Trash2, Moon, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission
} from '../lib/notifications'
import { trackError, ErrorCategory } from '../utils/errorTracking'

export default function Settings(){
  const { currentUser, changeEmail, changePassword, updateUserProfile, logout } = useAuth()
  const navigate = useNavigate()

  // Account Settings
  const [newEmail, setNewEmail] = useState('')
  const [emailUpdating, setEmailUpdating] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordUpdating, setPasswordUpdating] = useState(false)

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(currentUser?.preferences?.emailNotifications ?? true)
  const [publicProfile, setPublicProfile] = useState(currentUser?.preferences?.publicProfile ?? true)
  const [savingPreferences, setSavingPreferences] = useState(false)

  // Push Notifications
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState('default')
  const [enablingPush, setEnablingPush] = useState(false)

  useEffect(() => {
    setPushSupported(isNotificationSupported())
    setPushPermission(getNotificationPermission())
  }, [])

  async function handleEnablePushNotifications() {
    setEnablingPush(true)
    try {
      const token = await requestNotificationPermission(currentUser?.uid)
      if (token) {
        setPushPermission('granted')
      } else {
        setPushPermission(getNotificationPermission())
      }
    } catch (error) {
      trackError(error, { action: 'enablePushNotifications', userId: currentUser?.uid }, 'error', ErrorCategory.NOTIFICATION)
    } finally {
      setEnablingPush(false)
    }
  }

  async function handleEmailChange(e) {
    e.preventDefault()
    if (!newEmail || newEmail === currentUser.email) return

    setEmailUpdating(true)
    try {
      await changeEmail(newEmail)
      await updateDoc(doc(db, 'users', currentUser.uid), { email: newEmail })
      setNewEmail('')
      toast.success('Email updated successfully! ✅')
    } catch (error) {
      trackError(error, { action: 'updateEmail', userId: currentUser?.uid }, 'error', ErrorCategory.AUTH)
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in to change your email')
      } else {
        toast.error('Failed to update email')
      }
    } finally {
      setEmailUpdating(false)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setPasswordUpdating(true)
    try {
      await changePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully! 🔒')
    } catch (error) {
      trackError(error, { action: 'updatePassword', userId: currentUser?.uid }, 'error', ErrorCategory.AUTH)
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in to change your password')
      } else {
        toast.error('Failed to update password')
      }
    } finally {
      setPasswordUpdating(false)
    }
  }

  async function handlePreferencesSave() {
    setSavingPreferences(true)
    try {
      await updateUserProfile({
        preferences: {
          theme: 'dark', // Always dark for now
          emailNotifications,
          publicProfile
        }
      })
      toast.success('Preferences saved! ✨')
    } catch (error) {
      trackError(error, { action: 'savePreferences', userId: currentUser?.uid }, 'error', ErrorCategory.FIRESTORE)
      toast.error('Failed to save preferences')
    } finally {
      setSavingPreferences(false)
    }
  }

  async function handleDeleteAccount() {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )
    
    if (!confirmDelete) return

    const confirmAgain = window.prompt(
      'Type "DELETE" to confirm account deletion'
    )

    if (confirmAgain !== 'DELETE') {
      toast.error('Account deletion cancelled')
      return
    }

    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', currentUser.uid))
      
      // Delete Firebase Auth user
      await deleteUser(firebaseAuth.currentUser)
      
      toast.success('Account deleted')
      
      // Navigate to login
      navigate('/login')
    } catch (error) {
      trackError(error, { action: 'deleteAccount', userId: currentUser?.uid }, 'error', ErrorCategory.AUTH)
      if (error.code === 'auth/requires-recent-login') {
        toast.error('Please log out and log back in to delete your account')
      } else {
        toast.error('Failed to delete account')
      }
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <SettingsIcon size={32} />
        Settings
      </h2>
      <p className="text-zinc-300 mb-8">Manage your account and preferences</p>

      <div className="space-y-6">
        {/* Account Settings */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Mail size={20} />
            Account Settings
          </h3>

          {/* Change Email */}
          <form onSubmit={handleEmailChange} className="mb-6">
            <label className="block text-sm font-medium mb-2">Email Address</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={currentUser?.email}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                type="submit"
                disabled={emailUpdating || !newEmail}
                className="px-4 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emailUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>

          {/* Change Password */}
          <form onSubmit={handlePasswordChange}>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Lock size={16} />
              Change Password
            </label>
            <div className="space-y-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                type="submit"
                disabled={passwordUpdating || !newPassword || !confirmPassword}
                className="px-4 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordUpdating ? 'Updating...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Privacy Settings */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield size={20} />
            Privacy Settings
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Public Profile</div>
                <div className="text-sm text-zinc-400">Allow others to see your profile</div>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(e) => setPublicProfile(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-full h-full bg-white/10 peer-checked:bg-brand-400 rounded-full peer transition-all cursor-pointer"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-6 transition-all"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell size={20} />
            Notification Settings
          </h3>

          <div className="space-y-4">
            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <Smartphone size={16} />
                  Push Notifications
                </div>
                <div className="text-sm text-zinc-400">
                  {!pushSupported && 'Not supported on this device'}
                  {pushSupported && pushPermission === 'granted' && 'Enabled - you will receive push notifications'}
                  {pushSupported && pushPermission === 'denied' && 'Blocked - enable in browser settings'}
                  {pushSupported && pushPermission === 'default' && 'Get notified about messages and matches'}
                </div>
              </div>
              {pushSupported && pushPermission !== 'granted' && pushPermission !== 'denied' && (
                <button
                  onClick={handleEnablePushNotifications}
                  disabled={enablingPush}
                  className="px-4 py-2 btn-primary text-sm disabled:opacity-50"
                >
                  {enablingPush ? 'Enabling...' : 'Enable'}
                </button>
              )}
              {pushPermission === 'granted' && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                  Enabled
                </span>
              )}
              {pushPermission === 'denied' && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                  Blocked
                </span>
              )}
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email Notifications</div>
                <div className="text-sm text-zinc-400">Receive updates via email</div>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-full h-full bg-white/10 peer-checked:bg-brand-400 rounded-full peer transition-all cursor-pointer"></div>
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-6 transition-all"></div>
              </label>
            </div>
          </div>

          <button
            onClick={handlePreferencesSave}
            disabled={savingPreferences}
            className="mt-4 px-4 py-2 btn-primary disabled:opacity-50"
          >
            {savingPreferences ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        {/* Appearance - FIXED: No more "Light (Coming soon)" */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Moon size={20} />
            Appearance
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-sm text-zinc-400">Currently using Dark theme</div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
              <Moon size={16} className="text-brand-400" />
              <span className="font-medium">Dark</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            💡 Light theme coming in a future update
          </p>
        </div>

        {/* Danger Zone */}
        <div className="glass p-6 rounded-2xl border-2 border-red-500/20">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
            <Trash2 size={20} />
            Danger Zone
          </h3>
          <p className="text-zinc-300 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={handleDeleteAccount}
            className="px-6 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition"
          >
            Delete Account
          </button>
        </div>
      </div>
    </section>
  )
}
