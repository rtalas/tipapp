'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateSeriesResult } from '@/actions/series'
import { evaluateSeriesBets } from '@/actions/evaluate-series'
import { logger } from '@/lib/client-logger'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
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

  const handleSaveResult = async () => {
    if (!homeTeamScore || !awayTeamScore) {
      toast.error('Please enter scores for both teams')
      return
    }

    const homeScore = parseInt(homeTeamScore, 10)
    const awayScore = parseInt(awayTeamScore, 10)

    if (isNaN(homeScore) || isNaN(awayScore)) {
      toast.error('Scores must be valid numbers')
      return
    }

    if (homeScore < 0 || homeScore > 7 || awayScore < 0 || awayScore > 7) {
      toast.error('Scores must be between 0 and 7')
      return
    }

    if (homeScore < gamesRequired && awayScore < gamesRequired) {
      toast.error(`At least one team must have ${gamesRequired} wins (Best of ${bestOf})`)
      return
    }

    setIsSubmitting(true)

    try {
      await updateSeriesResult({
        seriesId: series.id,
        homeTeamScore: homeScore,
        awayTeamScore: awayScore,
      })

      toast.success('Series result saved successfully')
      // Keep dialog open so user can evaluate if needed
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to save series result')
      }
      logger.error('Failed to save series result', { error, seriesId: series.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEvaluate = async () => {
    if (!homeTeamScore || !awayTeamScore) {
      toast.error('Please save series result before evaluating')
      return
    }

    setIsEvaluating(true)

    try {
      const result = await evaluateSeriesBets({ seriesId: series.id })

      if (result.success && 'results' in result) {
        const betsCount = result.results?.length ?? 0
        toast.success(`Series evaluated! ${betsCount} bets scored.`)
        onOpenChange(false)
      } else if (!result.success) {
        toast.error('error' in result ? result.error : 'Failed to evaluate series')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to evaluate series')
      }
      logger.error('Failed to evaluate series', { error, seriesId: series.id })
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Series Result Entry</DialogTitle>
          <DialogDescription>
            {series.League.name} - {series.SpecialBetSerie.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Series Info */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {format(new Date(series.dateTime), 'MMM d, yyyy')}
              </span>
              {series.isEvaluated && (
                <Badge variant="evaluated">Evaluated</Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>{homeTeam.name}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{awayTeam.name}</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {series._count.UserSpecialBetSerie} user prediction{series._count.UserSpecialBetSerie !== 1 ? 's' : ''}
            </div>
          </div>

          <Separator />

          {/* Series Scores */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Best of {bestOf} (first to {gamesRequired} wins)
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeScore">{homeTeam.shortcut} Wins</Label>
                <Input
                  id="homeScore"
                  type="number"
                  min="0"
                  max="7"
                  value={homeTeamScore}
                  onChange={(e) => setHomeTeamScore(e.target.value)}
                  aria-label={`${homeTeam.name} score`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="awayScore">{awayTeam.shortcut} Wins</Label>
                <Input
                  id="awayScore"
                  type="number"
                  min="0"
                  max="7"
                  value={awayTeamScore}
                  onChange={(e) => setAwayTeamScore(e.target.value)}
                  aria-label={`${awayTeam.name} score`}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isEvaluating}
          >
            Close
          </Button>

          <Button
            onClick={handleSaveResult}
            disabled={isSubmitting || isEvaluating}
          >
            {isSubmitting ? 'Saving...' : 'Save Result'}
          </Button>

          <Button
            onClick={handleEvaluate}
            disabled={isSubmitting || isEvaluating || (!series.homeTeamScore && !homeTeamScore)}
            variant="default"
          >
            {isEvaluating ? 'Evaluating...' : series.isEvaluated ? 'Re-Evaluate' : 'Save & Evaluate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
