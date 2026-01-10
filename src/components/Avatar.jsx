import React, { memo, useState } from 'react'

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
}

const Avatar = memo(function Avatar({ user, name, size = 'md', className = '' }) {
  const [imageError, setImageError] = useState(false)

  // Support both user object and direct name prop
  const displayName = user?.displayName || user?.name || name || 'U'
  const photoURL = user?.photoURL
  const sizeClass = sizeClasses[size] || sizeClasses.md

  const initials = displayName
    .split(' ')
    .map(x => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (photoURL && !imageError) {
    return (
      <img
        src={photoURL}
        alt={displayName}
        loading="lazy"
        onError={() => setImageError(true)}
        className={`${sizeClass} rounded-full object-cover border border-white/10 ${className}`}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-white/10 border border-white/10 flex items-center justify-center font-medium ${className}`}>
      {initials}
    </div>
  )
})

export default Avatar
