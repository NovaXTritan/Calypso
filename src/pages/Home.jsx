import React from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import BlackHoleCanvas from '../components/BlackHoleCanvas'
import Card from '../components/Card'
import Magnetic from '../components/Magnetic'
import GitHubHeatmap from '../components/GitHubHeatmap'

export default function Home(){
  const { scrollYProgress } = useScroll()
  const intensity = useTransform(scrollYProgress, [0, 0.25, 1], [1.0, 1.35, 1.6])
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -30])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.85])

  return (
    <section className="relative overflow-hidden">
      {/* 3D background */}
      <motion.div style={{ opacity: heroOpacity }}>
        <BlackHoleCanvas intensity={intensity} />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />
      <div className="pointer-events-none absolute right-0 top-0 w-1/2 h-full bg-[radial-gradient(600px_420px_at_right_center,rgba(255,179,107,0.08),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-16 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* LEFT: hero copy */}
          <motion.div style={{ y: heroY }}>
            <motion.h1
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.6 }}
              className="text-5xl md:text-6xl font-extrabold leading-tight"
            >
              Turn intent into progress —<br className="hidden md:block"/>
              join pods, ship tiny proofs,<br className="hidden md:block"/>
              grow together.
            </motion.h1>

            <motion.p
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.65, delay:0.05 }}
              className="mt-4 text-lg text-zinc-300 max-w-2xl"
            >
              PeerLearn makes self-learning social and credible. Pick a pod—do 2-minute daily actions, and share proof of work to earn feedback and momentum.
            </motion.p>

            <motion.div
              initial={{ opacity:0, y:20 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.7, delay:0.1 }}
              className="mt-8 flex items-center gap-4"
            >
              <Magnetic><a href="#/pods" className="btn-primary focus-out">Explore Pods</a></Magnetic>
              <Magnetic><a href="#/matches" className="btn-ghost focus-out">Find Peers</a></Magnetic>
            </motion.div>
          </motion.div>

          {/* RIGHT: visual space to let the black hole breathe */}
          <div className="relative min-h-[440px]"></div>
        </div>

        {/* Cards Row 1 */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Magnetic className="block">
            <Card title="Retrieval Check (1 min)">
              <ul className="space-y-2 text-sm text-zinc-300">
                <li className="glass px-3 py-2 rounded-lg">Short-term cramming</li>
                <li className="glass px-3 py-2 rounded-lg">Long-term retention</li>
                <li className="glass px-3 py-2 rounded-lg">Note neatness</li>
                <li className="glass px-3 py-2 rounded-lg">Reading speed</li>
              </ul>
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="If-Then Habit">
              <p className="text-sm text-zinc-300">Two tiny cue-linked actions to stay consistent.</p>
              <div className="mt-3 flex gap-3">
                <button className="btn-primary text-sm">Start 2 min</button>
                <button className="btn-ghost text-sm">Freeze</button>
              </div>
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="Guided Next Steps" className="relative">
              <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{boxShadow:'0 0 60px rgba(255,179,107,0.25)'}} />
              <p className="text-sm text-zinc-300">Join 2 Pods based on your goal</p>
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="Gicced Next Steps" className="relative">
              <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{boxShadow:'0 0 60px rgba(255,179,107,0.18)'}} />
              <p className="text-sm text-zinc-300">Join 2 Pods based on your goal • Send 1 warm intro • RSVP to 1 event</p>
            </Card>
          </Magnetic>
        </div>

        {/* Cards Row 2 */}
        <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Magnetic className="block">
            <Card title="Proof & Feedback">
              <p className="text-sm text-zinc-300">Earn likes, warm-intros, critiques.</p>
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="Mood Label">
              <div className="mt-2 flex flex-wrap gap-2">
                {['Calm','Focused','Stressed','Anxious','Happy','Tired'].map(m => <span key={m} className="pill">{m}</span>)}
              </div>
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="Journal">
              <p className="text-sm text-zinc-300">Note your day in 120 seconds.</p>
            </Card>
          </Magnetic>

          <Magnetic className="block">
            <Card title="Today’s Event">
              <p className="text-sm text-zinc-300">1 community call at 7 PM.</p>
            </Card>
          </Magnetic>
        </div>

        {/* Heatmap */}
        <div className="mt-8">
          <GitHubHeatmap />
        </div>
      </div>
    </section>
  )
}
