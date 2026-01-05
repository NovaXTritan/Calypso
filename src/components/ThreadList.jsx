import React, { useState } from 'react'
import { useForum } from '../storeForum'

export default function ThreadList({ slug, onSelect, selectedId }){
  const threads = useForum(s => s.threads[slug] || [])
  const newThread = useForum(s => s.newThread)
  const [title, setTitle] = useState('')

  return (
    <div className="space-y-3">
      <div className="glass p-3">
        <div className="font-semibold mb-2">Threads</div>
        <div className="space-y-2">
          {threads.map(t => (
            <button key={t.id}
              className={`w-full text-left px-3 py-2 rounded-lg border ${selectedId===t.id?'bg-white/10 border-white/20':'bg-white/5 hover:bg-white/10 border-white/10'}`}
              onClick={()=>onSelect(t.id)}>
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-zinc-400">{new Date(t.createdAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="glass p-3">
        <div className="text-sm text-zinc-300 mb-2">Start a new thread</div>
        <div className="flex gap-2">
          <input className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title (e.g., Weekly Ship #2)" />
          <button className="btn-primary" onClick={()=>{ if(!title.trim()) return; newThread(slug, title.trim()); setTitle('') }}>Create</button>
        </div>
      </div>
    </div>
  )
}
