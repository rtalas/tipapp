import { cn } from '@/lib/utils'

interface ScorerRankingBadgeProps {
  ranking: number | null | undefined
  size?: 'sm' | 'md'
}

const sizeClasses = {
  sm: 'w-4 h-4 text-[10px]',
  md: 'w-5 h-5 text-xs',
}

export function ScorerRankingBadge({ ranking, size = 'sm' }: ScorerRankingBadgeProps) {
  if (!ranking || ranking < 1 || ranking > 4) return null

  return (
    <span
      className={cn(
        'ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/20 text-primary font-bold shrink-0',
        sizeClasses[size]
      )}
    >
      {ranking}
    </span>
  )
}
