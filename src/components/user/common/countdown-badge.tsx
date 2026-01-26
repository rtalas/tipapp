'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CountdownBadgeProps {
  deadline: Date
  className?: string
}

function formatTimeRemaining(deadline: Date): {
  text: string
  urgency: 'low' | 'medium' | 'high' | 'locked'
  showPulse: boolean
} {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()

  if (diff <= 0) {
    return { text: 'Locked', urgency: 'locked', showPulse: false }
  }

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  // More than 6 hours - don't show countdown
  if (hours > 6) {
    return { text: '', urgency: 'low', showPulse: false }
  }

  // Less than 6 hours - show detailed countdown
  if (hours > 0) {
    const remainingMins = Math.floor((diff / (1000 * 60)) % 60)
    const remainingSecs = seconds % 60
    return {
      text: `${hours}h ${remainingMins}m ${remainingSecs}s`,
      urgency: hours < 1 ? 'high' : 'medium',
      showPulse: true,
    }
  }

  if (minutes > 0) {
    const remainingSecs = seconds % 60
    return {
      text: `${minutes}m ${remainingSecs}s`,
      urgency: 'high',
      showPulse: true,
    }
  }

  return {
    text: `${seconds}s`,
    urgency: 'high',
    showPulse: true,
  }
}

export function CountdownBadge({ deadline, className }: CountdownBadgeProps) {
  const [timeInfo, setTimeInfo] = useState(() =>
    formatTimeRemaining(deadline)
  )

  useEffect(() => {
    const update = () => {
      setTimeInfo(formatTimeRemaining(deadline))
    }

    // Update immediately
    update()

    // Update every second for accurate countdown
    const interval = setInterval(update, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  // Don't render if more than 6 hours away
  if (!timeInfo.text) {
    return null
  }

  // Locked state
  if (timeInfo.urgency === 'locked') {
    return (
      <span
        className={cn(
          'flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-muted-foreground text-[10px] font-medium',
          className
        )}
      >
        <Lock className="w-3 h-3" />
        Locked
      </span>
    )
  }

  // Countdown state
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-semibold',
        timeInfo.showPulse && 'animate-pulse',
        className
      )}
    >
      <Clock className="w-3 h-3" />
      <span>{timeInfo.text}</span>
    </div>
  )
}
