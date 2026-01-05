import React, { useEffect, useRef } from 'react'

/** A lightweight cursor ring that follows the mouse for extra delight. */
export default function CursorRing(){
  const dot = useRef(null)
  useEffect(() => {
    const el = dot.current
    if (!el) return
    let raf=0; let x=0, y=0; let tx=0, ty=0
    const move = (e) => { tx = e.clientX; ty = e.clientY; if(!raf) raf=requestAnimationFrame(update) }
    const update = () => {
      x += (tx - x) * 0.2
      y += (ty - y) * 0.2
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('mousemove', move)
    return () => { window.removeEventListener('mousemove', move); if(raf) cancelAnimationFrame(raf) }
  }, [])
  return <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-50 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 mix-blend-screen" />
}
