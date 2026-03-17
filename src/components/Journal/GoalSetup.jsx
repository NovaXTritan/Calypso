import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { db } from '../../lib/firebase'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, Trash2, ArrowRight, ArrowLeft, Check, GripVertical, Heart } from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTED_AREAS = ['DSA', 'Projects', 'System Design', 'Networking', 'Communication', 'Reading']

const BALANCE_LABELS = {
  healthImportance: { label: 'Health', desc: 'Exercise, sleep, nutrition' },
  familyImportance: { label: 'Family', desc: 'Time with family' },
  friendsImportance: { label: 'Friends', desc: 'Social connections' },
  explorationImportance: { label: 'Exploration', desc: 'New interests, hobbies' },
  restImportance: { label: 'Rest', desc: 'Downtime, mental breaks' },
}

export default function GoalSetup({ onComplete }) {
  const { currentUser } = useAuth()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1: Primary goal
  const [primaryGoal, setPrimaryGoal] = useState('')
  const [targetDate, setTargetDate] = useState('')

  // Step 2: Focus areas
  const [focusAreas, setFocusAreas] = useState([
    { area: '', targetHoursPerWeek: 5, priority: 1 },
  ])

  // Step 3: Life balance
  const [lifeBalance, setLifeBalance] = useState({
    healthImportance: 5,
    familyImportance: 5,
    friendsImportance: 5,
    explorationImportance: 5,
    restImportance: 5,
  })

  function addFocusArea() {
    if (focusAreas.length >= 6) return
    setFocusAreas([
      ...focusAreas,
      { area: '', targetHoursPerWeek: 5, priority: focusAreas.length + 1 },
    ])
  }

  function removeFocusArea(index) {
    if (focusAreas.length <= 2) return
    const updated = focusAreas.filter((_, i) => i !== index)
    // Re-assign priorities
    setFocusAreas(updated.map((fa, i) => ({ ...fa, priority: i + 1 })))
  }

  function updateFocusArea(index, field, value) {
    const updated = [...focusAreas]
    updated[index] = { ...updated[index], [field]: value }
    setFocusAreas(updated)
  }

  function addSuggestedArea(name) {
    if (focusAreas.some((fa) => fa.area.toLowerCase() === name.toLowerCase())) return
    if (focusAreas.length >= 6) return

    // Fill empty slot or add new
    const emptyIndex = focusAreas.findIndex((fa) => !fa.area.trim())
    if (emptyIndex !== -1) {
      updateFocusArea(emptyIndex, 'area', name)
    } else {
      setFocusAreas([
        ...focusAreas,
        { area: name, targetHoursPerWeek: 5, priority: focusAreas.length + 1 },
      ])
    }
  }

  function canProceed() {
    if (step === 1) return primaryGoal.trim().length >= 5 && targetDate
    if (step === 2) {
      const validAreas = focusAreas.filter((fa) => fa.area.trim())
      return validAreas.length >= 2
    }
    return true
  }

  async function handleSave() {
    if (!currentUser) return

    setSaving(true)
    try {
      const goalData = {
        primaryGoal: primaryGoal.trim(),
        targetDate: Timestamp.fromDate(new Date(targetDate)),
        focusAreas: focusAreas
          .filter((fa) => fa.area.trim())
          .map((fa, i) => ({
            area: fa.area.trim(),
            targetHoursPerWeek: fa.targetHoursPerWeek,
            priority: i + 1,
          })),
        lifeBalance,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      await addDoc(
        collection(db, 'users', currentUser.uid, 'goals'),
        goalData
      )

      toast.success('Goals configured! Your AI analyst is ready.')
      onComplete?.()
    } catch (error) {
      console.error('Error saving goals:', error)
      toast.error('Failed to save goals. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step === s
                  ? 'bg-brand-500 text-white'
                  : step > s
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 text-zinc-500'
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-green-500/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Primary Goal */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass p-6 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">What's your main goal?</h3>
                <p className="text-sm text-zinc-400">Set a clear target for the next 3-6 months</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Primary Goal</label>
                <textarea
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-400 focus:outline-none min-h-[80px] text-sm"
                  placeholder="e.g., Get a backend engineering internship by June 2026"
                  maxLength={200}
                />
                <p className="text-xs text-zinc-500 mt-1">{primaryGoal.length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Focus Areas */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass p-6 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <GripVertical className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Focus Areas</h3>
                <p className="text-sm text-zinc-400">What are you spending time on? (min 2, max 6)</p>
              </div>
            </div>

            {/* Suggested areas */}
            <div className="flex flex-wrap gap-2 mb-4">
              {SUGGESTED_AREAS.map((name) => {
                const isAdded = focusAreas.some(
                  (fa) => fa.area.toLowerCase() === name.toLowerCase()
                )
                return (
                  <button
                    key={name}
                    onClick={() => addSuggestedArea(name)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isAdded
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {isAdded ? '+ ' : '+ '}{name}
                  </button>
                )
              })}
            </div>

            <div className="space-y-3">
              {focusAreas.map((fa, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <span className="text-xs text-zinc-500 font-medium w-5">P{index + 1}</span>
                  <input
                    type="text"
                    value={fa.area}
                    onChange={(e) => updateFocusArea(index, 'area', e.target.value)}
                    placeholder="Area name"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={fa.targetHoursPerWeek}
                      onChange={(e) =>
                        updateFocusArea(index, 'targetHoursPerWeek', parseInt(e.target.value))
                      }
                      className="w-20 accent-brand-500"
                    />
                    <span className="text-xs text-zinc-400 w-12 text-right">
                      {fa.targetHoursPerWeek}h/w
                    </span>
                  </div>
                  {focusAreas.length > 2 && (
                    <button
                      onClick={() => removeFocusArea(index)}
                      className="p-1 hover:bg-red-500/20 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}

              {focusAreas.length < 6 && (
                <button
                  onClick={addFocusArea}
                  className="w-full py-2.5 border border-dashed border-white/20 rounded-xl text-sm text-zinc-400 hover:text-zinc-300 hover:border-white/30 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Focus Area
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 3: Life Balance */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass p-6 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Life Balance</h3>
                <p className="text-sm text-zinc-400">
                  How important are these to you? No wrong answers.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {Object.entries(BALANCE_LABELS).map(([key, { label, desc }]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs text-zinc-500 ml-2">{desc}</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-400">
                      {lifeBalance[key]}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={lifeBalance[key]}
                    onChange={(e) =>
                      setLifeBalance({
                        ...lifeBalance,
                        [key]: parseInt(e.target.value),
                      })
                    }
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                    <span>Low priority</span>
                    <span>High priority</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Radar-like preview */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <p className="text-xs text-zinc-500 mb-3 text-center">Your Balance Profile</p>
              <div className="flex items-end justify-center gap-3 h-20">
                {Object.entries(BALANCE_LABELS).map(([key, { label }]) => (
                  <div key={key} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full bg-brand-500/40 rounded-t transition-all"
                      style={{ height: `${lifeBalance[key] * 8}px` }}
                    />
                    <span className="text-[9px] text-zinc-500 truncate w-full text-center">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-zinc-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 btn-primary rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 btn-primary rounded-xl text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Complete Setup'}
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
