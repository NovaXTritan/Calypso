// LandingPage.jsx - Public landing page with soothing visual experience
import React from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Users, Zap, Heart, BarChart3, ArrowRight, Rocket,
  Sparkles, Target, BookOpen, MessageCircle, Flame, Trophy
} from 'lucide-react'
import BlackHoleCanvas from './BlackHoleCanvas'
import FloatingOrbs from './FloatingOrbs'
import RevealOnScroll from './RevealOnScroll'
import GlowCard from './GlowCard'
import { AnimatedHeadline, GradientText, FadeInText } from './AnimatedText'
import SEO from './SEO'
import { pods } from '../podsData'

// Feature data with benefit-focused copy
const features = [
  {
    icon: Users,
    title: 'Find Your Tribe',
    description: 'Join 30+ focused communities around your learning goals. No noise, just people who get it.',
    color: 'from-brand-400 to-brand-600'
  },
  {
    icon: Zap,
    title: "Ship, Don't Just Learn",
    description: 'Post 2-minute daily proofs of progress. Small wins compound into unstoppable momentum.',
    color: 'from-glow-500 to-orange-500'
  },
  {
    icon: Heart,
    title: 'Never Learn Alone',
    description: 'Get matched with accountability partners who share your goals. Real support, real feedback.',
    color: 'from-pink-400 to-rose-500'
  },
  {
    icon: BarChart3,
    title: 'See Your Growth',
    description: 'Streaks, heatmaps, and leaderboards make progress visible. Watch yourself transform.',
    color: 'from-emerald-400 to-green-500'
  }
]

// Steps for "How it works"
const steps = [
  {
    icon: Target,
    title: 'Pick Your Path',
    description: 'Choose pods that match your learning goals'
  },
  {
    icon: BookOpen,
    title: 'Learn Daily',
    description: 'Spend time on your craft, however small'
  },
  {
    icon: MessageCircle,
    title: 'Share Proof',
    description: 'Post what you learned or built today'
  },
  {
    icon: Flame,
    title: 'Build Streaks',
    description: 'Consistency compounds into mastery'
  }
]

// Audience personas
const audienceTypes = [
  { label: 'Self-learners', description: 'Teaching yourself new skills' },
  { label: 'Career changers', description: 'Building expertise in a new field' },
  { label: 'Side-project builders', description: 'Shipping while working full-time' },
  { label: 'Curious minds', description: 'Learning for the joy of it' }
]

// Sample pods to showcase
const featuredPods = pods.slice(0, 8)

export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95])

  return (
    <div className="relative overflow-hidden">
      <SEO
        title="You Don't Have to Learn Alone"
        description="Join learning pods, ship daily proofs, and grow with peers who hold you accountable. Build momentum that lasts."
        path="/"
      />

      {/* Floating Orbs - Ambient Background */}
      <FloatingOrbs />

      {/* ==================== HERO SECTION ==================== */}
      <section className="relative min-h-screen flex items-center">
        {/* Black Hole Background */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 pointer-events-none"
        >
          <BlackHoleCanvas intensity={0.8} />
        </motion.div>

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-night-900/80 pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-sm mb-8 backdrop-blur-sm"
            >
              <Sparkles size={16} className="text-glow-500" />
              <span>A community for self-learners</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              <AnimatedHeadline delay={0.2}>
                You don't have to
              </AnimatedHeadline>
              <br />
              <span className="block mt-2">
                <AnimatedHeadline delay={0.5}>
                  learn alone
                </AnimatedHeadline>
              </span>
            </h1>

            {/* Subheadline */}
            <FadeInText
              delay={0.8}
              className="text-lg sm:text-xl text-zinc-300 mb-10 max-w-2xl leading-relaxed"
            >
              Learning is hard when no one's watching. Cosmos gives you a community
              that celebrates your small wins and keeps you going when motivation fades.
            </FadeInText>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to="/signup"
                className="btn-primary btn-breathe px-8 py-4 text-lg font-semibold flex items-center justify-center gap-2 group"
              >
                Start Your Journey
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="btn-ghost px-8 py-4 text-lg font-semibold flex items-center justify-center"
              >
                See How It Works
              </a>
            </motion.div>

            {/* Social proof hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="mt-8 text-sm text-zinc-500"
            >
              Free to join. No credit card required.
            </motion.p>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <a href="#problem" className="flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-300 transition">
            <span className="text-xs uppercase tracking-wider">Explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-5 h-8 rounded-full border-2 border-current flex items-start justify-center p-1.5"
            >
              <div className="w-1 h-2 bg-current rounded-full" />
            </motion.div>
          </a>
        </motion.div>
      </section>

      {/* ==================== PROBLEM SECTION ==================== */}
      <section id="problem" className="relative py-24 sm:py-32">
        <div className="section-divider mb-24" />

        <div className="mx-auto max-w-7xl px-4">
          <RevealOnScroll className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Sound familiar?
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              You start something new, full of excitement. Then...
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <RevealOnScroll delay={0}>
              <GlowCard className="h-full text-center py-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-brand-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Week 1 is amazing
                </h3>
                <p className="text-zinc-400">
                  You're motivated, making progress, feeling unstoppable.
                  Everything clicks.
                </p>
              </GlowCard>
            </RevealOnScroll>

            <RevealOnScroll delay={100}>
              <GlowCard className="h-full text-center py-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-glow-500/20 to-orange-500/20 flex items-center justify-center">
                  <Target className="w-8 h-8 text-glow-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Then life happens
                </h3>
                <p className="text-zinc-400">
                  A busy week. Missed days pile up. The spark fades.
                  No one notices you stopped.
                </p>
              </GlowCard>
            </RevealOnScroll>

            <RevealOnScroll delay={200}>
              <GlowCard className="h-full text-center py-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  It's not your fault
                </h3>
                <p className="text-zinc-400">
                  Learning alone wasn't designed for humans.
                  We're wired for community and accountability.
                </p>
              </GlowCard>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ==================== SOLUTION SECTION ==================== */}
      <section id="how-it-works" className="relative py-24 sm:py-32 bg-gradient-to-b from-transparent to-night-900/50">
        <div className="mx-auto max-w-7xl px-4">
          <RevealOnScroll className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Here's how <GradientText>Cosmos</GradientText> helps
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              A simple daily ritual that builds unstoppable momentum
            </p>
          </RevealOnScroll>

          {/* Steps Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {steps.map((step, index) => (
              <RevealOnScroll key={step.title} delay={index * 100}>
                <div className="relative">
                  {/* Connector line (hidden on last item and mobile) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-white/10 to-transparent" />
                  )}

                  <GlowCard className="text-center relative z-10">
                    {/* Step number */}
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-sm font-bold text-white">
                      {index + 1}
                    </div>

                    <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                      <step.icon className="w-7 h-7 text-brand-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {step.description}
                    </p>
                  </GlowCard>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Repeat indicator */}
          <RevealOnScroll delay={500}>
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                <Flame className="w-5 h-5 text-glow-500" />
                <span className="text-zinc-300">
                  Repeat daily. Watch your streak grow.
                </span>
                <Trophy className="w-5 h-5 text-glow-500" />
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ==================== FEATURES SECTION ==================== */}
      <section className="relative py-24 sm:py-32">
        <div className="section-divider mb-24" />

        <div className="mx-auto max-w-7xl px-4">
          <RevealOnScroll className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need to <GradientText>stay consistent</GradientText>
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Simple tools designed to keep you accountable
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <RevealOnScroll key={feature.title} delay={index * 100}>
                <GlowCard className="flex gap-5 items-start">
                  <div className={`w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </GlowCard>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== POD PREVIEW SECTION ==================== */}
      <section className="relative py-24 sm:py-32 bg-gradient-to-b from-transparent to-night-900/50">
        <div className="mx-auto max-w-7xl px-4">
          <RevealOnScroll className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              30+ learning communities
            </h2>
            <p className="text-lg text-zinc-400">
              Find your people. Pick pods that match your goals.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delay={100}>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {featuredPods.map((pod, i) => (
                <span
                  key={pod}
                  className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-sm hover:bg-white/10 hover:border-white/20 transition-all cursor-default"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {pod}
                </span>
              ))}
              <span className="px-4 py-2 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-sm">
                +{pods.length - featuredPods.length} more
              </span>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={200}>
            <div className="text-center">
              <Link
                to="/signup"
                className="btn-primary px-6 py-3 inline-flex items-center gap-2 group"
              >
                Explore All Pods
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ==================== AUDIENCE SECTION ==================== */}
      <section className="relative py-24 sm:py-32">
        <div className="section-divider mb-24" />

        <div className="mx-auto max-w-7xl px-4">
          <RevealOnScroll className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Is this for you?
            </h2>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Cosmos is built for people who want to learn, grow, and ship - together.
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {audienceTypes.map((audience, index) => (
              <RevealOnScroll key={audience.label} delay={index * 80}>
                <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
                  <div className="text-lg font-medium text-white mb-1">
                    {audience.label}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {audience.description}
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FINAL CTA SECTION ==================== */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4">
          <RevealOnScroll type="scale">
            <div className="glow-card p-10 sm:p-16 text-center relative overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-glow-500/10 pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Ready to start learning with others?
                </h2>
                <p className="text-lg text-zinc-300 mb-8 max-w-xl mx-auto">
                  Join a community that celebrates your progress, no matter how small.
                  Your learning journey doesn't have to be lonely.
                </p>
                <Link
                  to="/signup"
                  className="btn-primary btn-breathe px-10 py-4 text-lg font-semibold inline-flex items-center gap-2 group"
                >
                  Join Cosmos Free
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="mt-6 text-sm text-zinc-500">
                  Takes 30 seconds. No credit card needed.
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
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
          <div className="mt-8 text-center text-xs text-zinc-600">
            Built for learners, by learners.
          </div>
        </div>
      </footer>
    </div>
  )
}
