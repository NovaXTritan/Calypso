import { useEffect, useState } from 'react'
export default function useVisibility(){
  const [visible, set] = useState(true)
  useEffect(() => {
    const onVis = () => set(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return visible
}
