import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scroll, Anchor, Heart, Shield, Compass, Mountain } from 'lucide-react'

export default function Constitution() {
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)
  }, [])

  const ConstitutionQuote = ({ children }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="my-8 p-6 text-center relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-brand-400/10 via-glow-500/10 to-brand-400/10 rounded-2xl blur-xl"></div>
      <div className="relative glass-card p-8 rounded-2xl border-2 border-brand-400/20">
        <div className="text-xl md:text-2xl font-serif italic text-brand-100 leading-relaxed">
          {children}
        </div>
      </div>
    </motion.div>
  )

  const Section = ({ icon: Icon, title, children }) => (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="glass-card p-8 rounded-2xl mb-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-400/10 rounded-xl">
          <Icon className="text-brand-400" size={24} />
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="text-zinc-300 space-y-4">
        {children}
      </div>
    </motion.div>
  )

  const List = ({ items, type = 'check' }) => (
    <ul className="space-y-3">
      {items.map((item, idx) => (
        <motion.li
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-start gap-3"
        >
          <span className={`text-lg mt-1 ${type === 'check' ? 'text-glow-400' : 'text-red-400'}`}>
            {type === 'check' ? '✓' : '✗'}
          </span>
          <span className="flex-1">{item}</span>
        </motion.li>
      ))}
    </ul>
  )

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-400/5 via-transparent to-transparent"></div>
        
        <div className="relative mx-auto max-w-4xl px-4 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center p-4 bg-brand-400/10 rounded-2xl mb-6">
              <Scroll className="text-brand-400" size={48} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-brand-400 via-glow-400 to-brand-400 bg-clip-text text-transparent"
          >
            The Ethical Constitution of Cosmos
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-zinc-400 max-w-2xl mx-auto mb-8"
          >
            Our foundational principles and unwavering commitment to human dignity
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-400"
          >
            Beta Version 1.0 • December 2025
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 pb-16">
        
        {/* Opening Quote */}
        <ConstitutionQuote>
          "Cosmos does not exist to make you successful.<br/>
          It exists to make you unbreakable."
        </ConstitutionQuote>

        {/* What We Will Never Do */}
        <Section icon={Shield} title="What Cosmos Will Never Do">
          <List
            type="cross"
            items={[
              'Monetize fear, insecurity, urgency, or comparison.',
              'Shame, threaten, guilt, or manipulate behavior.',
              'Promise success, outcomes, ranks, or status.',
              'Replace human judgment or moral agency.',
              'Optimize for addiction, dopamine, or dependency.'
            ]}
          />
        </Section>

        {/* What We're Committed To */}
        <Section icon={Heart} title="What Cosmos Is Committed To">
          <List
            items={[
              'Preserving human dignity above efficiency.',
              'Building inner strength before external reward.',
              'Encouraging responsibility, not pressure.',
              'Serving truth, even when uncomfortable.',
              'Strengthening the individual\'s capacity to endure uncertainty.'
            ]}
          />
        </Section>

        {/* Mirror Quote */}
        <ConstitutionQuote>
          Cosmos is not a motivator.<br/>
          Cosmos is a mirror.
        </ConstitutionQuote>

        {/* Who It's For */}
        <Section icon={Compass} title="Who Cosmos Is For">
          <List
            items={[
              'Individuals who voluntarily choose difficulty.',
              'People who value character over applause.',
              'Those willing to be accountable to their own word.',
              'People who think in decades, not weeks.',
              'Those who seek internal stability, not external validation.'
            ]}
          />
        </Section>

        {/* Who It's Not For */}
        <Section icon={Mountain} title="Who Cosmos Is Not For">
          <List
            type="cross"
            items={[
              'People seeking quick wins or shortcuts.',
              'Those who want constant motivation or reassurance.',
              'People unwilling to face their own inconsistency.',
              'Users who outsource responsibility to tools.',
              'Anyone who wants comfort over growth.'
            ]}
          />
        </Section>

        {/* Readiness Quote */}
        <ConstitutionQuote>
          Cosmos does not chase users.<br/>
          Cosmos waits for readiness.
        </ConstitutionQuote>

        {/* How We Confront */}
        <Section icon={Anchor} title="How Cosmos Confronts Without Fear">
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-brand-400">Memory:</strong>
              <p className="mt-2">It remembers who you said you wanted to be.</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-glow-400">Reflection:</strong>
              <p className="mt-2">It shows you the gap between intent and action.</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-purple-400">Silence:</strong>
              <p className="mt-2">It allows discomfort to teach.</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-blue-400">Consistency:</strong>
              <p className="mt-2">It does not lower standards when emotions fluctuate.</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-yellow-400">Inquiry:</strong>
              <p className="mt-2">It asks questions instead of giving commands.</p>
            </div>
          </div>

          <div className="mt-6 p-6 bg-gradient-to-r from-brand-400/5 to-glow-400/5 rounded-xl border border-brand-400/20">
            <p className="text-zinc-400">
              Cosmos never says: <em className="text-red-400">"You will fail if you don't do this."</em>
            </p>
            <p className="mt-2 text-white">
              Cosmos asks: <em className="text-glow-400">"You chose this. Are you honoring it?"</em>
            </p>
          </div>
        </Section>

        {/* Responsibility Quote */}
        <ConstitutionQuote>
          Fear collapses character.<br/>
          Responsibility builds it.
        </ConstitutionQuote>

        {/* Company or Legacy */}
        <Section icon={Scroll} title="Company or Legacy?">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-brand-400 mb-3">If Cosmos is a company:</h3>
              <p>
                It optimizes for sustainability, not scale at any cost. It grows slowly, with high standards. 
                It serves a committed population. Revenue supports integrity.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-glow-400 mb-3">If Cosmos is a legacy:</h3>
              <p>
                It outlives trends and founders. It becomes a discipline, not a product. It influences how people live. 
                It is remembered for strengthening humans, not extracting value.
              </p>
            </div>
          </div>
        </Section>

        {/* Final Quote */}
        <ConstitutionQuote>
          If Cosmos succeeds,<br/>
          people will not say "it made me successful."<br/>
          They will say "it made me solid."
        </ConstitutionQuote>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-white/10 text-center text-sm text-zinc-500"
        >
          <p className="mb-2">Cosmos Constitution • Version 1.0</p>
          <p className="italic">"Built for those who choose the long road."</p>
        </motion.div>
      </div>
    </div>
  )
}
