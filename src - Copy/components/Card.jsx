import React from 'react'
export default function Card({title, subtitle, children, className=''}){
  return (
    <div className={`glass p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
      </div>
      <div className="text-zinc-200">{children}</div>
    </div>
  )
}
