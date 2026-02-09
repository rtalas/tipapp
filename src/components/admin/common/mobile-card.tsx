import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  expanded?: boolean
  expandable?: boolean
}

export function MobileCard({ children, className, onClick, expanded, expandable }: MobileCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
      {expandable && (
        <div className="flex justify-center pt-1">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  )
}

interface MobileCardFieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

export function MobileCardField({ label, children, className }: MobileCardFieldProps) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{children}</span>
    </div>
  )
}
