import { useEffect, useRef } from 'react'
export default function useMouseParallax(strength = 0.02){
  const target = useRef({ x:0, y:0 })
  useEffect(() => {
    const onMove = (e) => {
      const { innerWidth:w, innerHeight:h } = window
      target.current.x = (e.clientX - w/2) * strength
      target.current.y = (e.clientY - h/2) * strength
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [strength])
  return target
}
