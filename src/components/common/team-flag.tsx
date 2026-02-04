import Image from 'next/image'
import { cn } from '@/lib/utils'

interface TeamFlagProps {
  flagIcon: string | null
  flagType: string | null
  teamName: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'w-4 h-4 text-[10px]',
  sm: 'w-5 h-5 text-xs',
  md: 'w-6 h-6 text-sm',
  lg: 'w-8 h-8 text-base',
}

export function TeamFlag({
  flagIcon,
  flagType,
  teamName,
  size = 'md',
  className,
}: TeamFlagProps) {
  const sizeClass = sizeClasses[size]

  // Fallback: Show first letter of team name in circular badge
  const renderFallback = () => {
    const initial = teamName.charAt(0).toUpperCase()
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold shrink-0',
          sizeClass,
          className
        )}
        aria-label={`${teamName} logo`}
      >
        {initial}
      </div>
    )
  }

  // No flag data available
  if (!flagIcon || !flagType) {
    return renderFallback()
  }

  // Render emoji/text icon
  if (flagType === 'icon') {
    return (
      <span
        className={cn(
          'flex items-center justify-center shrink-0',
          sizeClass,
          className
        )}
        role="img"
        aria-label={`${teamName} flag`}
      >
        {flagIcon}
      </span>
    )
  }

  // Render image file
  if (flagType === 'path') {
    // Validate path starts with /logos/ for security
    if (!flagIcon.startsWith('/logos/')) {
      return renderFallback()
    }

    // Validate file extension
    const validExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
    const hasValidExtension = validExtensions.some((ext) =>
      flagIcon.toLowerCase().endsWith(ext)
    )
    if (!hasValidExtension) {
      return renderFallback()
    }

    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded',
          sizeClass,
          className
        )}
      >
        <Image
          src={flagIcon}
          alt={`${teamName} logo`}
          fill
          className="object-contain"
          onError={(e) => {
            // Hide broken image, show nothing (parent will handle layout)
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>
    )
  }

  // Unknown flagType
  return renderFallback()
}
