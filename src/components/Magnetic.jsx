import React, { useEffect, useRef } from 'react'

/**
 * Magnetic wrapper: mildly attracts to the cursor on hover.
 * Usage: <Magnetic strength={0.25}><button>Explore Pods</button></Magnetic>
 */
export default function Magnetic({ children, strength = 0.25, className='' }){
  const r = useRef(null)
  useEffect(() => {
    const el = r.current
    if (!el) return
    let raf = 0
    let hover = false
    let tx = 0, ty = 0, x = 0, y = 0

    const rect = () => el.getBoundingClientRect()

    const onMove = (e) => {
      if (!hover) return
      const b = rect()
      const cx = b.left + b.width/2
      const cy = b.top + b.height/2
      const dx = (e.clientX - cx)
      const dy = (e.clientY - cy)
      tx = dx * strength * 0.2
      ty = dy * strength * 0.2
      if (!raf) raf = requestAnimationFrame(update)
    }

    const onEnter = () => { hover = true }
    const onLeave = () => {
      hover = false
      tx = ty = 0
      if (!raf) raf = requestAnimationFrame(update)
    }

    const update = () => {
      x += (tx - x) * 0.18
      y += (ty - y) * 0.18
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      el.style.transition = 'transform 0s' // ensure rAF driven
      raf = hover || Math.abs(x) > 0.2 || Math.abs(y) > 0.2 ? requestAnimationFrame(update) : 0
    }

    window.addEventListener('mousemove', onMove)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
      el.style.transform = ''
    }
  }, [strength])

  return <div ref={r} className={className} style={{willChange:'transform', display:'inline-block'}}>{children}</div>
}
