import { useState, useRef, useCallback, useMemo } from 'react'
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion'
import useIsTouchDevice from '../../../hooks/useIsTouchDevice'

/**
 * FannedCardStack - A stacked card component that fans out on hover
 *
 * @param {Object} props
 * @param {string[]} props.images - Array of image URLs (2-4 images work best)
 * @param {string} props.title - Small label above subtitle (e.g., "THIS WEEK")
 * @param {string} [props.subtitle] - Main text (e.g., "Proofs")
 * @param {number} [props.count] - Optional count badge
 * @param {string} [props.badge] - Optional badge text (e.g., "3 🔥")
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.className] - Additional CSS classes
 */
export default function FannedCardStack({
  images = [],
  title,
  subtitle,
  count,
  badge,
  onClick,
  className = ''
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [hoveredCardIndex, setHoveredCardIndex] = useState(null)
  const [loadedImages, setLoadedImages] = useState({})
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  const prefersReducedMotion = usePrefersReducedMotion()
  const isTouch = useIsTouchDevice()

  // Limit to 4 images max for best visual effect
  const displayImages = useMemo(() => images.slice(0, 4), [images])

  // Calculate card transforms based on index and total count
  const getCardTransform = useCallback((index, total) => {
    const isFanned = isHovered || isFocused

    if (prefersReducedMotion) {
      // Simple offset for reduced motion - no rotation
      const offset = index * 3
      return {
        transform: `translateX(${offset}px) translateY(${-offset}px)`,
        zIndex: index
      }
    }

    if (!isFanned) {
      // Stacked state - slight offset to show depth
      const offset = index * 2.5
      return {
        transform: `translateX(${offset}px) translateY(${-offset}px) rotate(0deg)`,
        zIndex: index,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }
    }

    // Fanned state - spread with rotation
    const fanConfigs = {
      2: [
        { rotate: -12, x: -15, y: 0 },
        { rotate: 12, x: 15, y: 0 }
      ],
      3: [
        { rotate: -15, x: -20, y: 5 },
        { rotate: 0, x: 0, y: -5 },
        { rotate: 15, x: 20, y: 5 }
      ],
      4: [
        { rotate: -18, x: -25, y: 8 },
        { rotate: -6, x: -8, y: -2 },
        { rotate: 6, x: 8, y: -2 },
        { rotate: 18, x: 25, y: 8 }
      ]
    }

    const config = fanConfigs[total]?.[index] || { rotate: 0, x: 0, y: 0 }

    // Add subtle parallax based on mouse position (if not touch device)
    let parallaxX = 0
    let parallaxY = 0
    if (!isTouch && containerRef.current) {
      parallaxX = mousePosition.x * 3 * (index - (total - 1) / 2)
      parallaxY = mousePosition.y * 2
    }

    // Individual card hover lift
    const isCardHovered = hoveredCardIndex === index
    const liftY = isCardHovered ? -8 : 0
    const liftScale = isCardHovered ? 1.05 : 1

    return {
      transform: `
        translateX(${config.x + parallaxX}px)
        translateY(${config.y + parallaxY + liftY}px)
        rotate(${config.rotate}deg)
        scale(${liftScale})
      `.replace(/\s+/g, ' '),
      zIndex: isCardHovered ? 100 : total - index,
      transition: `transform ${0.35 + index * 0.05}s cubic-bezier(0.34, 1.56, 0.64, 1)`
    }
  }, [isHovered, isFocused, prefersReducedMotion, mousePosition, hoveredCardIndex, isTouch])

  // Handle mouse move for parallax
  const handleMouseMove = useCallback((e) => {
    if (prefersReducedMotion || isTouch || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2 // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2 // -1 to 1

    setMousePosition({ x, y })
  }, [prefersReducedMotion, isTouch])

  // Image load handler
  const handleImageLoad = useCallback((index) => {
    setLoadedImages(prev => ({ ...prev, [index]: true }))
  }, [])

  // Handle keyboard interaction
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }, [onClick])

  const isInteractive = isHovered || isFocused

  return (
    <div
      ref={containerRef}
      className={`
        group relative
        bg-white/[0.06] backdrop-blur-xl
        border border-white/10
        rounded-2xl p-4
        cursor-pointer
        transition-all duration-300
        hover:bg-white/[0.08] hover:border-white/15
        hover:shadow-glass
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-night-900
        ${prefersReducedMotion ? '' : 'hover:scale-[1.02]'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setHoveredCardIndex(null)
        setMousePosition({ x: 0, y: 0 })
      }}
      onMouseMove={handleMouseMove}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={`${title}${subtitle ? ` - ${subtitle}` : ''}${count ? ` (${count})` : ''}`}
    >
      {/* Card Stack Container */}
      <div
        className="relative h-28 mb-3 flex items-center justify-center"
        style={{ perspective: '800px' }}
      >
        {displayImages.length === 0 ? (
          // Empty state placeholder
          <div className="w-20 h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        ) : (
          displayImages.map((src, index) => {
            const style = getCardTransform(index, displayImages.length)
            const isLoaded = loadedImages[index]

            return (
              <div
                key={index}
                className={`
                  absolute w-20 h-24
                  rounded-xl overflow-hidden
                  shadow-lg
                  ${prefersReducedMotion ? '' : 'will-change-transform'}
                `}
                style={{
                  ...style,
                  transformOrigin: 'bottom center',
                  boxShadow: isInteractive
                    ? '0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
                    : '0 4px 12px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={() => !isTouch && setHoveredCardIndex(index)}
                onMouseLeave={() => !isTouch && setHoveredCardIndex(null)}
              >
                {/* Skeleton loader */}
                {!isLoaded && (
                  <div className="absolute inset-0 bg-night-700 animate-pulse" />
                )}

                {/* Image */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  onLoad={() => handleImageLoad(index)}
                  className={`
                    w-full h-full object-cover
                    transition-opacity duration-300
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}
                  `}
                />

                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            )
          })
        )}
      </div>

      {/* Content Section */}
      <div className="space-y-1">
        {/* Title - small caps style */}
        {title && (
          <p className="text-[11px] font-medium tracking-wider uppercase text-zinc-500">
            {title}
          </p>
        )}

        {/* Subtitle and badges row */}
        <div className="flex items-center justify-between gap-2">
          {subtitle && (
            <h3 className="text-base font-semibold text-white truncate">
              {subtitle}
            </h3>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Count badge */}
            {count !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-medium text-zinc-300">
                {count}
              </span>
            )}

            {/* Custom badge (e.g., streak) */}
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-glow-500/20 text-xs font-medium text-glow-500">
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      {!prefersReducedMotion && (
        <div
          className={`
            absolute inset-0 rounded-2xl pointer-events-none
            bg-gradient-to-br from-brand-500/5 via-transparent to-glow-500/5
            transition-opacity duration-300
            ${isInteractive ? 'opacity-100' : 'opacity-0'}
          `}
        />
      )}
    </div>
  )
}
