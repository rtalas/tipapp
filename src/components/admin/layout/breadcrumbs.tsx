'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const routeLabels: Record<string, string> = {
  admin: 'Admin',
  leagues: 'Leagues',
  matches: 'Matches',
  results: 'Results',
  users: 'Users',
  new: 'New',
  setup: 'Setup',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    // Check if segment is a dynamic ID (number or UUID-like)
    const isDynamicSegment = /^[0-9a-f-]+$/i.test(segment)
    const label = isDynamicSegment
      ? `#${segment.slice(0, 8)}`
      : routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

    return {
      href,
      label,
      isLast,
    }
  })

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
      <Link
        href="/admin"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.slice(1).map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className={cn(
                'text-muted-foreground hover:text-foreground transition-colors'
              )}
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
