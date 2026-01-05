# PeerLearn — Cosmos (Ultra)

A **1000× better** drop-in site:
- Realistic three.js black‑hole hero with parallax, reduced‑motion support, and visibility‑aware rendering
- Glassmorphism cards, warm glow accents, consistent system typography
- **PWA:** manifest + service worker (offline + faster reloads)
- **SEO:** OG/Twitter tags, robots.txt, canonical URL
- **Perf:** route code‑splitting, low‑end device throttling, tab‑hidden pause
- **A11y:** skip link, focus rings, semantic structure

## Dev
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy to GitHub Pages
- Repo name assumed: `cosmos` (change `base` in vite.config.js + `index.html`/`404.html` paths if different).
- In GitHub → Settings → Pages → Source = **GitHub Actions**.

The included workflow uses `npm install` (no lockfile required).
