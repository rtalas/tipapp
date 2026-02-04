'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DemoBannerProps {
  variant: 'login' | 'admin' | 'user'
}

export function DemoBanner({ variant }: DemoBannerProps) {
  const t = useTranslations('demo')
  const [isDismissed, setIsDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only allow dismissing the user variant
  const canDismiss = variant === 'user'

  // Wait for client-side hydration to complete
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Load dismissed state from localStorage (client-side only)
  useEffect(() => {
    if (canDismiss && typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('demo-banner-dismissed')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDismissed(dismissed === 'true')
    }
  }, [canDismiss])

  // Handle dismiss action
  const handleDismiss = () => {
    if (canDismiss) {
      localStorage.setItem('demo-banner-dismissed', 'true')
      setIsDismissed(true)
    }
  }

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null
  }

  // Don't render if not in demo mode
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
      return null
  }

  // Don't render if dismissed (user variant only)
  if (canDismiss && isDismissed) {
    return null
  }

  // Login variant - Full banner with credentials
  if (variant === 'login') {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Badge variant="warning" className="mt-0.5">
            {t('badge')}
          </Badge>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                {t('title')}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('message.login')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-800 p-3">
                <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  {t('credentials.admin')}
                </div>
                <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                  demo_admin / demo123
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded border border-amber-200 dark:border-amber-800 p-3">
                <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  {t('credentials.user')}
                </div>
                <div className="font-mono text-xs text-gray-700 dark:text-gray-300">
                  demo_user1 / demo123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Admin variant - Compact banner for admin pages
  if (variant === 'admin') {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="warning" className="text-xs">
            {t('badge')}
          </Badge>
          <span className="text-amber-800 dark:text-amber-200">
            {t('message.admin')}
          </span>
        </div>
      </div>
    )
  }

  // User variant - Dismissible banner for user pages
  if (variant === 'user') {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="warning" className="text-xs">
            {t('badge')}
          </Badge>
          <span className="flex-1 text-amber-800 dark:text-amber-200">
            {t('message.user')}
          </span>
          <button
            onClick={handleDismiss}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
            aria-label="Dismiss demo banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
