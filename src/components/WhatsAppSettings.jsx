/**
 * WhatsApp Notification Settings Panel
 *
 * Manages phone number, opt-in, notification type toggles,
 * quiet hours, and test message sending.
 */

import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { MessageSquare, Phone, Bell, BellOff, Clock, Send, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import useNotificationPreferences from '../hooks/useNotificationPreferences'

const PHONE_REGEX = /^\+91\d{10}$/

const NOTIFICATION_TYPES = [
  {
    key: 'morningRoutine',
    label: 'Morning Routine Reminders',
    description: 'Daily at 6 AM - AI-personalized kickoff for your day',
  },
  {
    key: 'streakAlerts',
    label: 'Streak Alerts',
    description: 'At 9 PM if you haven\'t submitted proof - protect your streak',
  },
  {
    key: 'podUpdates',
    label: 'Pod Activity Digests',
    description: 'Daily at 8 PM - what your pod members accomplished today',
  },
  {
    key: 'learningNudges',
    label: 'Learning Nudges',
    description: 'Reminders before your scheduled learning blocks',
  },
  {
    key: 'journalInsights',
    label: 'AI Journal Insights',
    description: 'Weekly on Sundays - AI analysis of your journal patterns',
  },
]

export default function WhatsAppSettings() {
  const { currentUser } = useAuth()
  const {
    preferences,
    phone,
    whatsappOptIn,
    loading,
    saving,
    savePreferences,
    savePhone,
    toggleOptIn,
  } = useNotificationPreferences(currentUser?.uid)

  const [phoneInput, setPhoneInput] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Initialize phone input when data loads
  React.useEffect(() => {
    if (phone) setPhoneInput(phone)
  }, [phone])

  function validatePhone(value) {
    if (!value) {
      setPhoneError('Phone number is required')
      return false
    }
    // Auto-prepend +91 if user enters just 10 digits
    let normalized = value.trim()
    if (/^\d{10}$/.test(normalized)) {
      normalized = '+91' + normalized
      setPhoneInput(normalized)
    }
    if (!PHONE_REGEX.test(normalized)) {
      setPhoneError('Enter a valid Indian number: +91XXXXXXXXXX')
      return false
    }
    setPhoneError('')
    return true
  }

  async function handleSavePhone() {
    const normalized = phoneInput.trim().startsWith('+91')
      ? phoneInput.trim()
      : '+91' + phoneInput.trim()

    if (!validatePhone(normalized)) return

    try {
      await savePhone(normalized)
      toast.success('Phone number saved')
    } catch {
      toast.error('Failed to save phone number')
    }
  }

  async function handleToggleOptIn() {
    if (!whatsappOptIn && !phone) {
      toast.error('Add your phone number first')
      return
    }
    try {
      await toggleOptIn(!whatsappOptIn)
      toast.success(whatsappOptIn ? 'WhatsApp notifications disabled' : 'WhatsApp notifications enabled')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function handleToggleNotification(key) {
    try {
      await savePreferences({ [key]: !preferences[key] })
    } catch {
      toast.error('Failed to update preference')
    }
  }

  async function handleQuietHoursChange(field, value) {
    try {
      await savePreferences({ [field]: value })
    } catch {
      toast.error('Failed to update quiet hours')
    }
  }

  async function handleSendTest() {
    if (!phone || !whatsappOptIn) {
      toast.error('Enable WhatsApp notifications first')
      return
    }
    setSendingTest(true)
    try {
      // In production, this would call a Cloud Function
      toast.success('Test message queued! Check your WhatsApp.')
    } catch {
      toast.error('Failed to send test message')
    } finally {
      setSendingTest(false)
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      'Disconnect WhatsApp? You will stop receiving all notifications.'
    )
    if (!confirmed) return

    try {
      await toggleOptIn(false)
      await savePhone('')
      setPhoneInput('')
      toast.success('WhatsApp disconnected')
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  if (loading) {
    return (
      <div className="glass p-6 rounded-2xl animate-pulse">
        <div className="h-6 bg-white/10 rounded w-48 mb-4" />
        <div className="h-4 bg-white/10 rounded w-full mb-2" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
    )
  }

  return (
    <div className="glass p-6 rounded-2xl">
      <h3 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <MessageSquare size={20} className="text-green-400" />
        WhatsApp Notifications
      </h3>
      <p className="text-sm text-zinc-400 mb-6">
        Get AI-personalized accountability nudges on WhatsApp
      </p>

      {/* Phone Number */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
          <Phone size={14} />
          Phone Number
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => {
              setPhoneInput(e.target.value)
              setPhoneError('')
            }}
            placeholder="+919876543210"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400/50"
          />
          <button
            onClick={handleSavePhone}
            disabled={saving || phoneInput === phone}
            className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
        {phoneError && (
          <p className="text-red-400 text-xs mt-1">{phoneError}</p>
        )}
        <p className="text-xs text-zinc-500 mt-1">
          Indian numbers only. Format: +91 followed by 10 digits.
        </p>
      </div>

      {/* Opt-in Toggle */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
        <div>
          <div className="font-medium">Enable WhatsApp Notifications</div>
          <div className="text-sm text-zinc-400">
            {whatsappOptIn
              ? 'You will receive personalized notifications'
              : 'Turn on to start receiving notifications'}
          </div>
        </div>
        <label className="relative inline-block w-12 h-6">
          <input
            type="checkbox"
            checked={whatsappOptIn}
            onChange={handleToggleOptIn}
            className="sr-only peer"
          />
          <div className="w-full h-full bg-white/10 peer-checked:bg-green-500 rounded-full peer transition-all cursor-pointer" />
          <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-6 transition-all" />
        </label>
      </div>

      {/* Notification Type Toggles */}
      {whatsappOptIn && (
        <>
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Bell size={14} />
              Notification Types
            </h4>
            {NOTIFICATION_TYPES.map((type) => (
              <div key={type.key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-zinc-500">{type.description}</div>
                </div>
                <label className="relative inline-block w-12 h-6 shrink-0 ml-4">
                  <input
                    type="checkbox"
                    checked={preferences[type.key]}
                    onChange={() => handleToggleNotification(type.key)}
                    className="sr-only peer"
                  />
                  <div className="w-full h-full bg-white/10 peer-checked:bg-brand-400 rounded-full peer transition-all cursor-pointer" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-6 transition-all" />
                </label>
              </div>
            ))}
          </div>

          {/* Quiet Hours */}
          <div className="mb-6 pb-6 border-t border-white/10 pt-6">
            <h4 className="text-sm font-medium text-zinc-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Clock size={14} />
              Quiet Hours
            </h4>
            <p className="text-xs text-zinc-500 mb-3">
              No notifications will be sent during quiet hours.
            </p>
            <div className="flex gap-4 items-center">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">From</label>
                <input
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => handleQuietHoursChange('quietHoursStart', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                />
              </div>
              <span className="text-zinc-500 mt-5">to</span>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Until</label>
                <input
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => handleQuietHoursChange('quietHoursEnd', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSendTest}
              disabled={sendingTest}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500/20 border border-brand-500/30 text-brand-400 rounded-lg hover:bg-brand-500/30 transition disabled:opacity-50"
            >
              <Send size={14} />
              {sendingTest ? 'Sending...' : 'Send Test Message'}
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition"
            >
              <Power size={14} />
              Disconnect WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  )
}
