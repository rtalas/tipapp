'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateMatchResult, getMatchById } from '@/actions/matches'
import { logger } from '@/lib/logging/client-logger'
import { ScoreEntryForm } from './score-entry-form'
import { ScorersList } from './scorers-list'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Team {
  id: number
  name: string
  shortcut: string
}

interface Player {
  id: number
  firstName: string | null
  lastName: string | null
  position: string | null
}

interface LeaguePlayer {
  id: number
  Player: Player
}

interface LeagueTeam {
  id: number
  Team: Team
  LeaguePlayer?: LeaguePlayer[]
}

interface Match {
  id: number
  dateTime: Date
  homeRegularScore: number | null
  awayRegularScore: number | null
  homeFinalScore: number | null
  awayFinalScore: number | null
  isOvertime: boolean
  isShootout: boolean
  isEvaluated: boolean
  isPlayoffGame: boolean
  LeagueTeam_Match_homeTeamIdToLeagueTeam: LeagueTeam
  LeagueTeam_Match_awayTeamIdToLeagueTeam: LeagueTeam
}

interface LeagueMatch {
  id: number
  isDoubled: boolean
  League: { name: string; sportId: number }
  Match: Match
}

interface Scorer {
  playerId: string
  numberOfGoals: number
}

interface ResultEntryDialogProps {
  match: LeagueMatch
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResultEntryDialog({ match, open, onOpenChange }: ResultEntryDialogProps) {
  const t = useTranslations('admin.matches.resultDialog')
  const tCommon = useTranslations('admin.common')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [homeRegularScore, setHomeRegularScore] = useState(
    match.Match.homeRegularScore?.toString() ?? ''
  )
  const [awayRegularScore, setAwayRegularScore] = useState(
    match.Match.awayRegularScore?.toString() ?? ''
  )
  const [homeFinalScore, setHomeFinalScore] = useState(
    match.Match.homeFinalScore?.toString() ?? ''
  )
  const [awayFinalScore, setAwayFinalScore] = useState(
    match.Match.awayFinalScore?.toString() ?? ''
  )
  const [isOvertime, setIsOvertime] = useState(match.Match.isOvertime ?? false)
  const [isShootout, setIsShootout] = useState(match.Match.isShootout ?? false)
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [hasScorers, setHasScorers] = useState(true)
  const [players, setPlayers] = useState<{
    home: LeaguePlayer[]
    away: LeaguePlayer[]
  }>({ home: [], away: [] })

  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
  const sportId = match.League.sportId

  const loadMatchData = useCallback(async () => {
    try {
      const fullMatch = await getMatchById(match.Match.id)
      if (fullMatch) {
        // Get players from both teams (T3: Context-Aware Scorer Selection)
        setPlayers({
          home: fullMatch.LeagueTeam_Match_homeTeamIdToLeagueTeam.LeaguePlayer || [],
          away: fullMatch.LeagueTeam_Match_awayTeamIdToLeagueTeam.LeaguePlayer || [],
        })

        // Load existing scorers (if any)
        if (fullMatch.MatchScorer?.length) {
          setScorers(
            fullMatch.MatchScorer.map((ms) => ({
              playerId: ms.scorerId.toString(),
              numberOfGoals: ms.numberOfGoals,
            }))
          )
        }
        // Always default to hasScorers=true (checkbox unchecked)
        // Admins must actively check "No scorers" for rare 0:0 games
      }
    } catch (error) {
      logger.error('Failed to load match data', { error, matchId: match.Match.id })
    }
  }, [match.Match.id])

  // Load full match data with players when dialog opens
  useEffect(() => {
    if (open) {
      loadMatchData()
    }
  }, [open, loadMatchData])

  // Auto-populate final scores with regular scores when overtime is checked
  useEffect(() => {
    if ((isOvertime || isShootout) && homeRegularScore && awayRegularScore) {
      // Only populate if final scores are empty
      if (!homeFinalScore) {
        setHomeFinalScore(homeRegularScore)
      }
      if (!awayFinalScore) {
        setAwayFinalScore(awayRegularScore)
      }
    }
  }, [isOvertime, isShootout, homeRegularScore, awayRegularScore, homeFinalScore, awayFinalScore])

  const handleOvertimeChange = (checked: boolean) => {
    setIsOvertime(checked)
    if (checked) setIsShootout(false)
  }

  const handleShootoutChange = (checked: boolean) => {
    setIsShootout(checked)
    if (checked) setIsOvertime(true)
  }

  const handleAddScorer = () => {
    setScorers([...scorers, { playerId: '', numberOfGoals: 1 }])
  }

  const handleRemoveScorer = (index: number) => {
    setScorers(scorers.filter((_, i) => i !== index))
  }

  const handleScorerChange = (index: number, field: keyof Scorer, value: string | number) => {
    const newScorers = [...scorers]
    newScorers[index] = { ...newScorers[index], [field]: value }
    setScorers(newScorers)
  }

  const handleHasScorersChange = (hasScorersValue: boolean) => {
    setHasScorers(hasScorersValue)
    if (!hasScorersValue) {
      setScorers([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!homeRegularScore || !awayRegularScore) {
      toast.error(t('regularScoresRequired'))
      return
    }

    // If overtime/shootout, validate final scores
    if ((isOvertime || isShootout) && (!homeFinalScore || !awayFinalScore)) {
      toast.error(t('finalScoresRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      await updateMatchResult({
        matchId: match.Match.id,
        homeRegularScore: parseInt(homeRegularScore, 10),
        awayRegularScore: parseInt(awayRegularScore, 10),
        homeFinalScore: (isOvertime || isShootout) ? parseInt(homeFinalScore, 10) : undefined,
        awayFinalScore: (isOvertime || isShootout) ? parseInt(awayFinalScore, 10) : undefined,
        isOvertime,
        isShootout,
        scorers: hasScorers
          ? scorers
              .filter((s) => s.playerId)
              .map((s) => ({
                playerId: parseInt(s.playerId, 10),
                numberOfGoals: s.numberOfGoals,
              }))
          : [],
      })

      toast.success(t('saveSuccess'))
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('saveFailed'))
      }
      logger.error('Failed to save match result', { error, matchId: match.Match.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {match.League.name} • {format(new Date(match.Match.dateTime), 'PPP p')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <ScoreEntryForm
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeRegularScore={homeRegularScore}
              awayRegularScore={awayRegularScore}
              homeFinalScore={homeFinalScore}
              awayFinalScore={awayFinalScore}
              isOvertime={isOvertime}
              isShootout={isShootout}
              onHomeRegularScoreChange={setHomeRegularScore}
              onAwayRegularScoreChange={setAwayRegularScore}
              onHomeFinalScoreChange={setHomeFinalScore}
              onAwayFinalScoreChange={setAwayFinalScore}
              onOvertimeChange={handleOvertimeChange}
              onShootoutChange={handleShootoutChange}
            />

            <ScorersList
              scorers={scorers}
              hasScorers={hasScorers}
              sportId={sportId}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              players={players}
              onAddScorer={handleAddScorer}
              onRemoveScorer={handleRemoveScorer}
              onScorerChange={handleScorerChange}
              onHasScorersChange={handleHasScorersChange}
            />

            {/* Match info badges */}
            <div className="flex flex-wrap gap-2">
              {match.Match.isPlayoffGame && (
                <Badge variant="warning">{t('playoffGame')}</Badge>
              )}
              {match.isDoubled && (
                <Badge variant="default">{t('doublePoints')}</Badge>
              )}
              {match.Match.isEvaluated && (
                <Badge variant="evaluated">{t('evaluated')}</Badge>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? tCommon('saving') : t('saveResult')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
