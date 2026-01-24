'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter, usePathname } from 'next/navigation'
import { useLeagueContext } from '@/contexts/league-context'
import { useTranslations } from 'next-intl'
import type { League } from '@prisma/client'

interface LeagueSelectorProps {
  leagues: League[]
  currentLeagueId?: number
}

export function LeagueSelector({ leagues, currentLeagueId }: LeagueSelectorProps) {
  const t = useTranslations('admin.common')
  const router = useRouter()
  const pathname = usePathname()
  const { selectedLeagueId, setSelectedLeagueId } = useLeagueContext()

  // Use context value if available, otherwise fallback to prop
  const displayLeagueId = selectedLeagueId || currentLeagueId?.toString()

  const handleChange = (leagueId: string) => {
    // Update context (will be used by sidebar immediately)
    setSelectedLeagueId(leagueId)

    // Check if currently on a league-specific route
    const leagueRouteMatch = pathname.match(/^\/admin\/\d+\/(.+)$/)

    if (leagueRouteMatch) {
      // Already on a league route, stay on the same page type
      const currentPage = leagueRouteMatch[1]
      router.push(`/admin/${leagueId}/${currentPage}`)
    } else {
      // On a global route, navigate to matches page of selected league
      router.push(`/admin/${leagueId}/matches`)
    }
  }

  if (leagues.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t('noLeaguesAvailable')}</span>
      </div>
    )
  }

  return (
    <Select
      value={displayLeagueId || ''}
      onValueChange={handleChange}
      disabled={leagues.length === 0}
    >
      <SelectTrigger className="w-[280px]" aria-label={t('selectLeague')}>
        <SelectValue placeholder={t('selectLeague')} />
      </SelectTrigger>
      <SelectContent>
        {leagues.map((league) => (
          <SelectItem key={league.id} value={league.id.toString()}>
            {league.name} {league.seasonFrom}/{league.seasonTo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
