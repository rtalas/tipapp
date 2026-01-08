import Image from 'next/image'
import { cn } from '@/lib/utils'

interface TeamFlagProps {
  flagIcon?: string | null
  flagType?: string | null
  teamName: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function TeamFlag({ flagIcon, flagType, teamName, className, size = 'md' }: TeamFlagProps) {
  if (!flagIcon) {
    return null
  }

  if (flagType === 'path') {
    // Display as image from /public folder
    return (
      <Image
        src={flagIcon}
        alt={`${teamName} logo`}
        width={32}
        height={32}
        className={cn(sizeClasses[size], 'object-contain', className)}
      />
    )
  }

  // Display as CSS icon class (default for national flags)
  return (
    <span
      className={cn(sizeClasses[size], 'inline-block', flagIcon, className)}
      title={teamName}
      aria-label={`${teamName} flag`}
    />
  )
}
