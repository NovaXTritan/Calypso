// LandingPage.jsx - Public landing page for non-authenticated visitors
import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Zap, Heart, BarChart3, ArrowRight, Rocket } from 'lucide-react'
import BlackHoleCanvas from './BlackHoleCanvas'
import SEO from './SEO'

const features = [
  {
    icon: Users,
    title: 'Learning Pods',
    description: 'Join focused communities around your goals. Learn together, grow together.',
    color: 'text-brand-400'
  },
  {
    icon: Zap,
    title: 'Daily Proofs',
    description: 'Ship small wins every day to build unstoppable momentum.',
    color: 'text-glow-500'
  },
  {
    icon: Heart,
    title: 'Peer Matching',
    description: 'Connect with learners on the same journey. Find your accountability partners.',
    color: 'text-pink-400'
  },
  {
    icon: BarChart3,
    title: 'Track Progress',
    description: 'Visualize your growth with streaks, analytics, and insights.',
    color: 'text-green-400'
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
}

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <SEO
        title="Turn Intent Into Progress"
        description="Join learning pods, ship daily proofs, and grow with peers who hold you accountable. Build momentum that lasts."
        path="/"
      />
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        {/* Background Black Hole */}
        <div className="absolute inset-0 pointer-events-none">
          <BlackHoleCanvas intensity={0.8} />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-3xl"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-6"
            >
              <Rocket size={16} />
              <span>Peer Learning Platform</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Turn intent into{' '}
              <span className="bg-gradient-to-r from-brand-400 to-glow-500 bg-clip-text text-transparent">
                progress
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-zinc-300 mb-8 max-w-2xl leading-relaxed">
              Join learning pods, ship micro-proofs daily, and grow with peers who hold you accountable.
              Build momentum that lasts.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/signup"
                className="btn-primary px-8 py-4 text-lg font-semibold flex items-center justify-center gap-2 group"
              >
                Get Started Free
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#features"
                className="btn-ghost px-8 py-4 text-lg font-semibold flex items-center justify-center"
              >
                Learn More
              </a>
            </div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex items-center gap-6 text-sm text-zinc-400"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-glow-500 border-2 border-night-900 flex items-center justify-center text-xs font-bold text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span>Join learners building in public</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <a href="#features" className="flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-300 transition">
            <span className="text-xs uppercase tracking-wider">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-5 h-8 rounded-full border-2 border-current flex items-start justify-center p-1"
            >
              <div className="w-1 h-2 bg-current rounded-full" />
            </motion.div>
          </a>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to{' '}
              <span className="text-brand-400">learn consistently</span>
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Simple tools designed to keep you accountable and connected with your learning community.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="glass p-6 rounded-2xl hover:bg-white/10 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${feature.color}`}>
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-24 sm:py-32 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-lg text-zinc-400">
              Get started in three simple steps
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { step: '01', title: 'Join a Pod', description: 'Pick a learning topic and join a community of focused learners.' },
              { step: '02', title: 'Ship Daily Proofs', description: 'Share what you learned or built. Small wins compound over time.' },
              { step: '03', title: 'Grow Together', description: 'Get feedback, find peers, and build lasting learning habits.' }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                variants={itemVariants}
                className="relative"
              >
                <div className="text-6xl font-bold text-white/5 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative pt-8">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-zinc-400">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass p-12 sm:p-16 rounded-3xl relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-glow-500/10 pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to start your learning journey?
              </h2>
              <p className="text-lg text-zinc-300 mb-8 max-w-xl mx-auto">
                Join a community of learners who ship daily and hold each other accountable.
              </p>
              <Link
                to="/signup"
                className="btn-primary px-10 py-4 text-lg font-semibold inline-flex items-center gap-2 group"
              >
                Create Free Account
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="mt-6 text-sm text-zinc-500">
                No credit card required. Start learning today.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Rocket size={24} className="text-brand-400" />
              <span>Cosmos</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-400">
              <Link to="/constitution" className="hover:text-white transition">
                Constitution
              </Link>
              <Link to="/login" className="hover:text-white transition">
                Log In
              </Link>
              <Link to="/signup" className="hover:text-white transition">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
