# Cosmos: Research-Backed Peer Learning Platform

**TL;DR:** 52% of Indian business graduates are unemployable (India Skills Report 2025). Cosmos is a peer accountability platform built on behavioral science — small pods of 5-8 people doing daily micro-actions with evidence-backed engagement mechanics. 30+ beta users across 30 pods.

🔗 **Live:** [cosmos-e42b5.web.app](https://cosmos-e42b5.web.app)

---

## Why This Exists

Study groups fail because they're unstructured. Motivation apps fail because accountability is social, not algorithmic. After reviewing 50+ peer-reviewed papers, we found that the most effective learning interventions share three properties:

| Mechanism | Effect Size | Source |
|-----------|-------------|--------|
| Implementation intentions ("if-then" plans) | d=0.65 | Gollwitzer & Sheeran |
| Cooperative learning structures | d=0.54 | Johnson & Johnson |
| Testing/retrieval practice | d=0.61-0.73 | Roediger & Butler |
| After-action review | d=0.69 | DeRue et al. |

Cosmos implements all four in a single platform.

## How It Works

**Pods** — Groups of 5-8 people with shared goals. High structure (daily proofs, weekly reflections) + high intimacy (accountability partners, mood check-ins).

**Daily Proofs** — 2-minute micro-actions with timestamps. Not "did you study?" but "show what you did." Loss aversion via streak mechanics.

**Peer Feedback Loop** — Pod forum with threaded discussions, accountability partner matching (algorithmic, based on goals/activity/skills), warm introductions for networking.

## What's Built (73 line items, 7 development phases)

**Core Platform:** Authentication, pod creation/management, daily proof composer, activity heatmap (GitHub-style), streak tracking, pod forums, user profiles, mood check-ins, accountability partner matching, warm introductions, notifications, chat, leaderboards, weekly reflections

**Security & Performance:**
- Firebase API key exposure incident → responded with website restrictions, API restrictions, comprehensive Firestore rules
- XSS protection via DOMPurify + Zod validation
- Auth state verification on all writes (prevents userId spoofing)
- Client-side rate limiting (5 proofs/minute)
- Firestore reads reduced from ~2,053 to ~100 per session (**20x improvement**)
- Cloud Functions for server-side aggregation (2,000 → 35 reads)
- WebGL memory leak fix on BlackHole canvas animation
- Infinite scroll pagination, memoized components

**Business Materials:** 2 pitch decks (E-Chai Ventures + pre-seed), financial model (435 formulas, 6 sheets), 60-second pitch script, LinkedIn content strategy (3 carousel versions)

## Tech Stack

**Frontend:** React + Vite, Framer Motion, Tailwind CSS, Zustand state management

**Backend:** Firebase (Auth + Firestore + Hosting + Cloud Functions)

**Design:** "Orbital Minimalism" — Space Grotesk typography, deep space navy + nebula purple, WebGL black hole hero animation

## Traction

- 30+ beta users across active pods
- Currently consolidating from 30 → 3-5 highly active pods (quality over quantity)
- Founder-led onboarding: personal WhatsApp outreach, daily pod participation

## Key Product Learning

> "Students pay for outcomes, not processes."

Accountability is a feature people want but won't pay for. The monetization path is through concrete deliverables: job placement, employer connections, verified work samples (see: Cosmos Work Trials — in development).

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Repository Structure

```
├── src/
│   ├── components/   # React components (pods, proofs, forums, profiles)
│   ├── services/     # Firebase service layer (auth, pods, proofs, chat)
│   ├── context/      # CosmosContext — global state, real-time listeners
│   └── utils/        # Sanitization (DOMPurify), validation (Zod), rate limiting
├── functions/        # Cloud Functions (pod stats aggregation)
└── public/           # Static assets, BlackHole canvas
```

---

*Built by [Divyanshu Kumar](https://github.com/NovaXTritan) — building systems that make people actually follow through.*
