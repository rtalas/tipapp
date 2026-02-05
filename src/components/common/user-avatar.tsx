'use client'

import { useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  /** User's avatar URL (from Supabase storage) */
  avatarUrl?: string | null
  /** User's first name */
  firstName?: string | null
  /** User's last name */
  lastName?: string | null
  /** User's username (fallback if no names) */
  username: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Additional className for the Avatar container */
  className?: string
  /** Additional className for the fallback */
  fallbackClassName?: string
  /** Whether this is the current user (affects styling) */
  isCurrentUser?: boolean
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-20 w-20',
}

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-sm',
  xl: 'text-2xl',
}

/**
 * Get user initials from name or username
 */
function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  username: string
): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

/**
 * Reusable user avatar component that displays profile picture with initials fallback.
 * Uses Radix Avatar's built-in image loading with automatic fallback.
 */
export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  username,
  size = 'md',
  className,
  fallbackClassName,
  isCurrentUser = false,
}: UserAvatarProps) {
  const initials = useMemo(
    () => getInitials(firstName, lastName, username),
    [firstName, lastName, username]
  )

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={`${firstName || username}'s avatar`}
        />
      )}
      <AvatarFallback
        className={cn(
          textSizeClasses[size],
          'font-semibold',
          isCurrentUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary',
          fallbackClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
