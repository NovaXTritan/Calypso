import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { Calendar, Trash2, Search, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const MOODS = ['Calm', 'Focused', 'Stressed', 'Anxious', 'Happy', 'Tired']

export default function Journal(){
  const { currentUser } = useAuth()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('Calm')
  const [tags, setTags] = useState('')
  const [entries, setEntries] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    fetchEntries()
  }, [currentUser])

  async function fetchEntries() {
    if (!currentUser) {
      setDebugInfo('No currentUser - user not logged in')
      return
    }

    setDebugInfo(`Fetching entries for user: ${currentUser.uid}`)
    
    try {
      // Try WITHOUT orderBy first (in case index is missing)
      const q = query(
        collection(db, 'journal_entries'),
        where('userId', '==', currentUser.uid)
      )
      
      const snapshot = await getDocs(q)
      setDebugInfo(`Found ${snapshot.docs.length} documents`)
      
      const entriesData = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('Entry data:', data) // Debug log
        return {
          id: doc.id,
          ...data
        }
      })
      
      // Sort manually since we removed orderBy
      entriesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      
      setEntries(entriesData)
      setFetchError(null)
      
      if (entriesData.length > 0) {
        toast.success(`Loaded ${entriesData.length} entries`)
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
      setFetchError(error.message)
      setDebugInfo(`Error: ${error.message}`)
      toast.error('Failed to load entries: ' + error.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!content.trim()) {
      toast.error('Please write something first!')
      return
    }

    setLoading(true)
    setDebugInfo('Saving entry...')
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const entryData = {
        userId: currentUser.uid,
        date: today,
        mood,
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        createdAt: Date.now()
      }
      
      console.log('Saving entry:', entryData) // Debug log
      
      const docRef = await addDoc(collection(db, 'journal_entries'), entryData)
      
      console.log('Entry saved with ID:', docRef.id) // Debug log
      setDebugInfo(`Entry saved! ID: ${docRef.id}`)

      toast.success('Journal entry saved! 📝')
      setContent('')
      setTags('')
      
      // Fetch again to show new entry
      await fetchEntries()
    } catch (error) {
      console.error('Error saving entry:', error)
      setDebugInfo(`Save error: ${error.message}`)
      toast.error('Failed to save: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteEntry(entryId) {
    try {
      await deleteDoc(doc(db, 'journal_entries', entryId))
      toast.success('Entry deleted')
      await fetchEntries()
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Failed to delete: ' + error.message)
    }
  }

  const filteredEntries = entries.filter(entry =>
    entry.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Journal</h2>
      
      {/* Debug Info Panel - Remove after fixing */}
      {debugInfo && (
        <div className="glass p-4 rounded-xl mb-6 border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-500 mt-1" size={20} />
            <div>
              <p className="text-sm text-yellow-500 font-semibold mb-1">Debug Info:</p>
              <p className="text-sm text-zinc-400">{debugInfo}</p>
              <p className="text-xs text-zinc-500 mt-2">User ID: {currentUser?.uid}</p>
              <p className="text-xs text-zinc-500">Entries count: {entries.length}</p>
            </div>
          </div>
        </div>
      )}
      
      {fetchError && (
        <div className="glass p-4 rounded-xl mb-6 border border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-500 mt-1" size={20} />
            <div>
              <p className="text-sm text-red-500 font-semibold mb-1">Firebase Error:</p>
              <p className="text-sm text-zinc-400">{fetchError}</p>
              <p className="text-xs text-zinc-500 mt-2">
                This might be a permissions or index issue. Check Firebase Console.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <div className="glass p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4">New Entry</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                How are you feeling? *
              </label>
              <select
                value={mood}
                onChange={e => setMood(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none"
                required
              >
                {MOODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                What's on your mind? * 
                <span className="text-xs text-zinc-500 ml-2">
                  {content.length}/500
                </span>
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none min-h-[150px]"
                placeholder="Write your thoughts..."
                maxLength={500}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none"
                placeholder="productivity, goals, reflection"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </div>

        {/* Entries List */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Your Entries ({entries.length})</h3>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search entries..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none text-sm"
            />
          </div>

          {/* Entries */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="glass p-6 rounded-2xl text-center text-zinc-400">
                {entries.length === 0 ? (
                  <>
                    <p className="mb-2">No entries yet.</p>
                    <p className="text-sm">Write your first entry to get started! →</p>
                  </>
                ) : (
                  <p>No entries match "{searchTerm}"</p>
                )}
              </div>
            ) : (
              filteredEntries.map(entry => (
                <div key={entry.id} className="glass p-5 rounded-2xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-zinc-400" />
                      <span className="text-sm text-zinc-400">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown date'}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-brand-400/20 text-brand-400 text-xs">
                        {entry.mood || 'Unknown'}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-1 hover:bg-red-500/20 rounded-lg transition"
                      title="Delete entry"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>

                  <p className="text-zinc-200 mb-3 whitespace-pre-wrap">
                    {entry.content || 'No content'}
                  </p>

                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-white/5 text-xs text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
