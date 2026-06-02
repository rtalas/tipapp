'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateSeriesResult } from '@/actions/series'
import { logger } from '@/lib/logging/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface Team {
  id: number
  name: string
  shortcut: string
}

interface LeagueTeam {
  id: number
  Team: Team
}

interface SpecialBetSerie {
  id: number
  name: string
  bestOf: number
}

interface Series {
  id: number
  dateTime: Date
  homeTeamScore: number | null
  awayTeamScore: number | null
  isEvaluated: boolean
  League: { name: string }
  SpecialBetSerie: SpecialBetSerie
  LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: LeagueTeam
  LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: LeagueTeam
  _count: {
    UserSpecialBetSerie: number
  }
}

interface ResultEntryDialogProps {
  series: Series
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResultEntryDialog({ series, open, onOpenChange }: ResultEntryDialogProps) {
  const t = useTranslations('admin.series.resultDialog')
  const tCommon = useTranslations('admin.common')
  const tSeries = useTranslations('admin.series')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [homeTeamScore, setHomeTeamScore] = useState(
    series.homeTeamScore?.toString() ?? ''
  )
  const [awayTeamScore, setAwayTeamScore] = useState(
    series.awayTeamScore?.toString() ?? ''
  )

  const homeTeam = series.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team
  const awayTeam = series.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team
  const bestOf = series.SpecialBetSerie.bestOf
  const gamesRequired = Math.ceil(bestOf / 2)
  const userPredictionCount = series._count.UserSpecialBetSerie

  const handleSaveResult = async () => {
    if (!homeTeamScore || !awayTeamScore) {
      toast.error(t('scoresRequired'))
      return
    }

    const homeScore = parseInt(homeTeamScore, 10)
    const awayScore = parseInt(awayTeamScore, 10)

    if (isNaN(homeScore) || isNaN(awayScore)) {
      toast.error(t('scoresMustBeNumbers'))
      return
    }

    if (homeScore < 0 || awayScore < 0 || homeScore > bestOf || awayScore > bestOf) {
      toast.error(t('scoresOutOfRange', { max: bestOf }))
      return
    }

    if (homeScore < gamesRequired && awayScore < gamesRequired) {
      toast.error(t('winsRequired', { winsNeeded: gamesRequired, bestOf }))
      return
    }

    setIsSubmitting(true)

    try {
      await updateSeriesResult({
        seriesId: series.id,
        homeTeamScore: homeScore,
        awayTeamScore: awayScore,
      })

      toast.success(t('saveSuccess'))
      // Keep dialog open so user can evaluate if needed
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('saveFailed'))
      }
      logger.error('Failed to save series result', { error, seriesId: series.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {series.League.name} - {series.SpecialBetSerie.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Series Info */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {format(new Date(series.dateTime), 'PPP')}
              </span>
              {series.isEvaluated && (
                <Badge variant="evaluated">{tSeries('evaluated')}</Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>{homeTeam.name}</span>
              <span className="text-muted-foreground">{tSeries('vs')}</span>
              <span>{awayTeam.name}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {t('userPredictions', { count: userPredictionCount })}
            </div>
          </div>

          <Separator />

          {/* Series Scores */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t('bestOfSummary', { bestOf, winsNeeded: gamesRequired })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeScore">{t('teamWins', { team: homeTeam.shortcut })}</Label>
                <Input
                  id="homeScore"
                  type="number"
                  min="0"
                  max={bestOf}
                  value={homeTeamScore}
                  onChange={(e) => setHomeTeamScore(e.target.value)}
                  aria-label={t('teamScoreAria', { team: homeTeam.name })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="awayScore">{t('teamWins', { team: awayTeam.shortcut })}</Label>
                <Input
                  id="awayScore"
                  type="number"
                  min="0"
                  max={bestOf}
                  value={awayTeamScore}
                  onChange={(e) => setAwayTeamScore(e.target.value)}
                  aria-label={t('teamScoreAria', { team: awayTeam.name })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon('close')}
          </Button>

          <Button
            onClick={handleSaveResult}
            disabled={isSubmitting}
          >
            {isSubmitting ? tCommon('saving') : t('saveResult')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
