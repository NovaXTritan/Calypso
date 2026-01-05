import React, { useMemo } from 'react'

// Simple GitHub-like contribution heatmap for the past 52 weeks.
export default function GitHubHeatmap({ seed = 42 }){
  const weeks = 53
  const days = 7
  const data = useMemo(() => {
    // deterministic pseudo-random
    let s = seed
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
    const arr = Array.from({ length: weeks }, () =>
      Array.from({ length: days }, () => Math.floor(Math.pow(rand(), 0.55) * 5)) // levels 0..4
    )
    // bias: more activity in recent weeks
    for (let w = 0; w < weeks; w++) {
      const boost = (w > weeks-8) ? 1 : 0
      for (let d = 0; d < days; d++) arr[w][d] = Math.min(4, arr[w][d] + boost)
    }
    return arr
  }, [seed])

  const color = (v) => {
    switch(v){
      case 0: return 'bg-zinc-800/60'
      case 1: return 'bg-brand-300/30'
      case 2: return 'bg-brand-400/50'
      case 3: return 'bg-brand-500/70'
      default: return 'bg-brand-600'
    }
  }

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Streak Heatmap</h3>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Less</span>
          {[0,1,2,3,4].map(i => <span key={i} className={`w-3 h-3 rounded-sm ${color(i)}`}/>)}
          <span>More</span>
        </div>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pr-1" aria-hidden="true">
        {data.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((v, j) => <div key={j} className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-sm ${color(v)}`}></div>)}
          </div>
        ))}
      </div>
    </div>
  )
}
