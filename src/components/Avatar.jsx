import React from 'react'
export default function Avatar({ name }){
  const initials = (name||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()
  return <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs">{initials}</div>
}
