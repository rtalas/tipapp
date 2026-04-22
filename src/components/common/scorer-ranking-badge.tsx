interface ScorerRankingBadgeProps {
  ranking: number | null | undefined
}

export function ScorerRankingBadge({ ranking }: ScorerRankingBadgeProps) {
  if (!ranking || ranking < 1 || ranking > 4) return null

  return (
    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold shrink-0">
      {ranking}
    </span>
  )
}
