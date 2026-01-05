/**
 * PWA Icon Generator for Cosmos
 * Run with: node scripts/generate-icons.mjs
 *
 * This creates PNG icons from the SVG favicon using canvas.
 * Requires: npm install canvas --save-dev
 */

import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// Icon sizes to generate
const sizes = [
  { size: 192, name: 'icon-192.png', maskable: false },
  { size: 512, name: 'icon-512.png', maskable: false },
  { size: 192, name: 'icon-maskable-192.png', maskable: true },
  { size: 512, name: 'icon-maskable-512.png', maskable: true },
  { size: 96, name: 'icon-pods.png', maskable: false },
  { size: 96, name: 'icon-journal.png', maskable: false },
  { size: 96, name: 'icon-analytics.png', maskable: false },
]

function drawBlackHoleIcon(ctx, size, maskable = false) {
  const center = size / 2
  const padding = maskable ? size * 0.1 : 0 // 10% padding for maskable
  const radius = (size / 2) - padding

  // Background for maskable icons
  if (maskable) {
    ctx.fillStyle = '#0b0e16'
    ctx.fillRect(0, 0, size, size)
  }

  // Outer glow gradient
  const gradient = ctx.createRadialGradient(center, center, radius * 0.3, center, center, radius)
  gradient.addColorStop(0, '#000000')
  gradient.addColorStop(0.7, '#000000')
  gradient.addColorStop(0.85, '#ff9750')
  gradient.addColorStop(1, '#ffb36b')

  // Draw main circle with glow
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  // Inner black hole
  ctx.beginPath()
  ctx.arc(center, center, radius * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = '#000000'
  ctx.fill()

  // Accretion disk effect (subtle ring)
  ctx.beginPath()
  ctx.arc(center, center, radius * 0.5, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 179, 107, 0.3)'
  ctx.lineWidth = radius * 0.08
  ctx.stroke()
}

function drawPodsIcon(ctx, size) {
  const center = size / 2
  const radius = size * 0.35

  // Background
  ctx.fillStyle = '#0b0e16'
  ctx.beginPath()
  ctx.arc(center, center, size * 0.45, 0, Math.PI * 2)
  ctx.fill()

  // Draw three overlapping circles (pods)
  const positions = [
    { x: center - radius * 0.4, y: center - radius * 0.2 },
    { x: center + radius * 0.4, y: center - radius * 0.2 },
    { x: center, y: center + radius * 0.4 },
  ]
  const colors = ['#667dff', '#8fa6ff', '#b2c3ff']

  positions.forEach((pos, i) => {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = colors[i]
    ctx.globalAlpha = 0.8
    ctx.fill()
    ctx.globalAlpha = 1
  })
}

function drawJournalIcon(ctx, size) {
  const padding = size * 0.2
  const width = size - padding * 2
  const height = size - padding * 2

  // Background
  ctx.fillStyle = '#0b0e16'
  ctx.fillRect(0, 0, size, size)

  // Book shape
  ctx.fillStyle = '#667dff'
  ctx.beginPath()
  ctx.roundRect(padding, padding, width, height, size * 0.08)
  ctx.fill()

  // Lines on book
  ctx.strokeStyle = '#0b0e16'
  ctx.lineWidth = size * 0.04
  const lineY = [0.35, 0.5, 0.65]
  lineY.forEach(y => {
    ctx.beginPath()
    ctx.moveTo(padding + width * 0.2, size * y)
    ctx.lineTo(padding + width * 0.8, size * y)
    ctx.stroke()
  })
}

function drawAnalyticsIcon(ctx, size) {
  const padding = size * 0.15

  // Background
  ctx.fillStyle = '#0b0e16'
  ctx.fillRect(0, 0, size, size)

  // Bar chart
  const bars = [
    { x: 0.2, h: 0.4 },
    { x: 0.4, h: 0.7 },
    { x: 0.6, h: 0.5 },
    { x: 0.8, h: 0.85 },
  ]
  const barWidth = size * 0.12
  const maxHeight = size - padding * 2

  bars.forEach((bar, i) => {
    const x = size * bar.x - barWidth / 2
    const h = maxHeight * bar.h
    const y = size - padding - h

    const gradient = ctx.createLinearGradient(x, y + h, x, y)
    gradient.addColorStop(0, '#667dff')
    gradient.addColorStop(1, '#ffb36b')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, h, size * 0.03)
    ctx.fill()
  })
}

// Generate icons
console.log('Generating PWA icons...\n')

sizes.forEach(({ size, name, maskable }) => {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Clear canvas
  ctx.clearRect(0, 0, size, size)

  // Draw appropriate icon
  if (name.includes('pods')) {
    drawPodsIcon(ctx, size)
  } else if (name.includes('journal')) {
    drawJournalIcon(ctx, size)
  } else if (name.includes('analytics')) {
    drawAnalyticsIcon(ctx, size)
  } else {
    drawBlackHoleIcon(ctx, size, maskable)
  }

  // Save to file
  const buffer = canvas.toBuffer('image/png')
  const filepath = join(publicDir, name)
  writeFileSync(filepath, buffer)
  console.log(`✓ Generated ${name} (${size}x${size})`)
})

console.log('\nDone! Icons saved to public/ folder.')
