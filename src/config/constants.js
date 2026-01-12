// src/config/constants.js - Centralized configuration constants

// ============================================
// MODERATOR CONFIGURATION
// ============================================

/**
 * Moderator email addresses with full privileges
 * In production, consider moving this to environment variables or Firestore
 */
export const MODERATOR_EMAILS = [
  'divyanshukumar0163@gmail.com'
]

/**
 * Check if an email has moderator privileges
 */
export const isModerator = (email) => {
  if (!email || typeof email !== 'string') return false
  return MODERATOR_EMAILS.includes(email.toLowerCase())
}

// ============================================
// POD CONFIGURATION
// ============================================

/**
 * Default pod data with metadata
 * Used as fallback when custom pod data is not available
 */
export const PODS_DATA = [
  { slug: 'entrepreneurship', name: 'Entrepreneurship', description: 'Building startups and businesses' },
  { slug: 'ai', name: 'AI', description: 'Artificial intelligence and machine learning' },
  { slug: 'consulting', name: 'Consulting', description: 'Strategy and management consulting' },
  { slug: 'finance', name: 'Finance', description: 'Financial markets and investment' },
  { slug: 'analytics', name: 'Analytics', description: 'Business and data analytics' },
  { slug: 'marketing', name: 'Marketing', description: 'Digital marketing and growth strategies' },
  { slug: 'astrophysics', name: 'Astrophysics', description: 'Space science and cosmic phenomena' },
  { slug: 'psychology', name: 'Psychology', description: 'Human behavior and mental processes' },
  { slug: 'neuroeconomics', name: 'Neuroeconomics', description: 'Intersection of neuroscience and economics' },
  { slug: 'economics', name: 'Economics', description: 'Economic theory and policy' },
  { slug: 'computer-science', name: 'Computer Science', description: 'Programming and computational theory' },
  { slug: 'statistics-risk-actuary', name: 'Statistics + Risk + Actuary', description: 'Statistical analysis and risk management' },
  { slug: 'social-media', name: 'Social Media', description: 'Social platforms and content creation' },
  { slug: 'literary', name: 'Literary', description: 'Literature and creative writing' },
  { slug: 'robotics', name: 'Robotics', description: 'Robotics and automation' },
  { slug: 'cosmology', name: 'Cosmology', description: 'Study of the universe and its origins' },
  { slug: 'biotech', name: 'BioTech', description: 'Biotechnology and life sciences' },
  { slug: 'data-science', name: 'Data Science', description: 'Data analysis and visualization' },
  { slug: 'product-management', name: 'Product Management', description: 'Product strategy and development' },
  { slug: 'ux-ui-design', name: 'UX/UI Design', description: 'User experience and interface design' },
  { slug: 'cybersecurity', name: 'Cybersecurity', description: 'Security and ethical hacking' },
  { slug: 'cloud-devops', name: 'Cloud & DevOps', description: 'Cloud infrastructure and operations' },
  { slug: 'blockchain', name: 'Blockchain', description: 'Web3 and decentralized technologies' },
  { slug: 'game-development', name: 'Game Development', description: 'Game design and development' },
  { slug: 'healthcare', name: 'Healthcare', description: 'Healthcare innovation and technology' },
  { slug: 'edtech', name: 'EdTech', description: 'Education technology and learning' },
  { slug: 'climate-tech', name: 'Climate Tech', description: 'Environmental technology and sustainability' },
  { slug: 'mathematics', name: 'Mathematics', description: 'Pure and applied mathematics' },
  { slug: 'law-policy', name: 'Law & Policy', description: 'Legal studies and policy analysis' },
  { slug: 'music-audio', name: 'Music & Audio', description: 'Music production and audio engineering' },
  { slug: 'dsa', name: 'DSA & Algorithms', description: 'Data structures and algorithmic problem solving' },
  { slug: 'webdev', name: 'Web Development', description: 'Frontend, backend, and full-stack development' },
  { slug: 'ai-ml', name: 'AI & Machine Learning', description: 'Artificial intelligence and machine learning' },
  { slug: 'placement', name: 'Placement Prep', description: 'Interview preparation and career guidance' },
  { slug: 'open-source', name: 'Open Source', description: 'Contributing to open source projects' },
]

/**
 * Get pod data by slug
 */
export const getPodBySlug = (slug) => {
  if (!slug) return null
  return PODS_DATA.find(p => p.slug === slug) || null
}

/**
 * Convert pod name to URL-friendly slug
 */
export const slugify = (s) => {
  if (!s || typeof s !== 'string') return ''
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Get all pod slugs
 */
export const getAllPodSlugs = () => PODS_DATA.map(p => p.slug)

/**
 * Get all pod names
 */
export const getAllPodNames = () => PODS_DATA.map(p => p.name)
