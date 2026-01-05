import React from 'react'

export default function Footer(){
  return (
    <footer className="border-t border-white/10 bg-black/40">
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-zinc-400 flex flex-col sm:flex-row items-center gap-2">
        <span>© {new Date().getFullYear()} PeerLearn</span>
        <span className="opacity-60">Cosmos edition • PWA enabled</span>
        <span className="sm:ml-auto text-zinc-300">
          Developed under the guidance of <span className="font-semibold text-brand-400">Dr. Jasmine Ma'am</span>
        </span>
      </div>
    </footer>
  )
}