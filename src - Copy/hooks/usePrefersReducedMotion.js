import { useEffect, useState } from 'react'
export default function usePrefersReducedMotion(){
  const [prefers, set] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    set(mq.matches)
    const onChange = e => set(e.matches)
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange)
    return () => mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange)
  }, [])
  return prefers
}
