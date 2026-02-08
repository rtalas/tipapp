'use client'

import { useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

// --------------- shared 1-second tick ---------------
// Single setInterval shared by every CountdownBadge on the page.
// Starts on first subscribe, stops when the last one unsubscribes.

let tick = 0
const listeners: Set<() => void> = new Set()
let timer: ReturnType<typeof setInterval> | null = null

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (listeners.size === 1) {
    timer = setInterval(() => {
      tick++
      listeners.forEach((l) => l())
    }, 1000)
  }
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

function getSnapshot() {
  return tick
}

function getServerSnapshot() {
  return 0
}

// --------------- formatting ---------------

interface CountdownBadgeProps {
  deadline: Date | string
  className?: string
}

function formatTimeRemaining(deadline: Date | string, lockedLabel: string): {
  text: string
  urgency: 'low' | 'medium' | 'high' | 'locked'
  showPulse: boolean
} {
  const now = new Date()
  const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()

  if (diff <= 0) {
    return { text: lockedLabel, urgency: 'locked', showPulse: false }
  }

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

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

// --------------- component ---------------

export function CountdownBadge({ deadline, className }: CountdownBadgeProps) {
  const t = useTranslations('user.common')
  const lockedLabel = t('locked')

  // Subscribe to the shared tick — re-renders once per second
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const timeInfo = formatTimeRemaining(deadline, lockedLabel)

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
        {timeInfo.text}
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
