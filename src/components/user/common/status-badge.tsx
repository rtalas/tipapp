'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { getEventStatus, type EventStatus } from '@/lib/event-status-utils'

interface StatusBadgeProps {
  dateTime: Date
  isEvaluated: boolean
  className?: string
}

/**
 * Displays event status badge:
 * - "Awaiting evaluation" for started but not evaluated events
 * - Nothing for scheduled events (time badge shown separately)
 * - Nothing for evaluated events (points badge shown separately)
 */
export function StatusBadge({ dateTime, isEvaluated, className }: StatusBadgeProps) {
  const t = useTranslations('common.status')
  const status = getEventStatus(dateTime, isEvaluated)

  // Only show badge for awaiting-evaluation status
  if (status !== 'awaiting-evaluation') {
    return null
  }

  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-amber-500/20 text-amber-600 dark:text-amber-500',
        className
      )}
    >
      {t('awaitingEvaluation')}
    </span>
  )
}

export { type EventStatus }
