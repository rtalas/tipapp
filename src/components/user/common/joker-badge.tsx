import { Star, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'

type JokerBadgeVariant = 'used' | 'blocked'

interface JokerBadgeProps {
  variant: JokerBadgeVariant
  label?: string
  title?: string
  className?: string
}

const VARIANT_CLASSES: Record<JokerBadgeVariant, string> = {
  used: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  blocked: 'bg-muted text-muted-foreground',
}

export function JokerBadge({ variant, label, title, className }: JokerBadgeProps) {
  const Icon = variant === 'blocked' ? Ban : Star

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {label && <span>{label}</span>}
    </span>
  )
}
