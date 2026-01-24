'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { updateMatchResult, getMatchById } from '@/actions/matches'
import { logger } from '@/lib/client-logger'
import { SPORT_IDS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
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
  isOvertime: boolean | null
  isShootout: boolean | null
  isEvaluated: boolean
  isPlayoffGame: boolean
  LeagueTeam_Match_homeTeamIdToLeagueTeam: LeagueTeam
  LeagueTeam_Match_awayTeamIdToLeagueTeam: LeagueTeam
}

interface LeagueMatch {
  id: number
  isDoubled: boolean | null
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

  // Load full match data with players when dialog opens
  useEffect(() => {
    if (open) {
      loadMatchData()
    }
  }, [open, match.Match.id])

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
  }, [isOvertime, isShootout, homeRegularScore, awayRegularScore])

  const loadMatchData = async () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!homeRegularScore || !awayRegularScore) {
      toast.error('Please enter regular time scores')
      return
    }

    // If overtime/shootout, validate final scores
    if ((isOvertime || isShootout) && (!homeFinalScore || !awayFinalScore)) {
      toast.error('Please enter final scores for overtime/shootout')
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

      toast.success('Match result saved successfully')
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to save result')
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
          <DialogTitle>Enter Match Result</DialogTitle>
          <DialogDescription>
            {match.League.name} • {format(new Date(match.Match.dateTime), 'PPP p')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            {/* Teams display */}
            <div className="flex items-center justify-between text-center">
              <div className="flex-1">
                <p className="font-semibold">{homeTeam.Team.name}</p>
                <p className="text-sm text-muted-foreground">Home</p>
              </div>
              <div className="px-4 text-lg font-bold text-muted-foreground">vs</div>
              <div className="flex-1">
                <p className="font-semibold">{awayTeam.Team.name}</p>
                <p className="text-sm text-muted-foreground">Away</p>
              </div>
            </div>

            <Separator />

            {/* Score entry */}
            <div className="space-y-4">
              {/* Overtime/Shootout checkboxes first */}
              <div className="flex items-center gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isOvertime"
                    checked={isOvertime}
                    onCheckedChange={(checked) => {
                      setIsOvertime(checked === true)
                      if (checked) setIsShootout(false)
                    }}
                  />
                  <Label htmlFor="isOvertime" className="text-sm font-normal">
                    Overtime
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isShootout"
                    checked={isShootout}
                    onCheckedChange={(checked) => {
                      setIsShootout(checked === true)
                      if (checked) setIsOvertime(true)
                    }}
                  />
                  <Label htmlFor="isShootout" className="text-sm font-normal">
                    Shootout
                  </Label>
                </div>
              </div>

              {/* Regular time score */}
              <div>
                <h4 className="font-medium mb-3">
                  {isOvertime || isShootout ? 'Regular Time Score' : 'Final Score'}
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="homeRegularScore">{homeTeam.Team.shortcut || 'Home'}</Label>
                    <Input
                      id="homeRegularScore"
                      type="number"
                      min="0"
                      value={homeRegularScore}
                      onChange={(e) => setHomeRegularScore(e.target.value)}
                      className="text-center text-2xl font-bold h-14"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground pt-6">:</span>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="awayRegularScore">{awayTeam.Team.shortcut || 'Away'}</Label>
                    <Input
                      id="awayRegularScore"
                      type="number"
                      min="0"
                      value={awayRegularScore}
                      onChange={(e) => setAwayRegularScore(e.target.value)}
                      className="text-center text-2xl font-bold h-14"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Final score (only show if overtime/shootout) */}
              {(isOvertime || isShootout) && (
                <div>
                  <h4 className="font-medium mb-3">Final Score (After OT/SO)</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="homeFinalScore">{homeTeam.Team.shortcut || 'Home'}</Label>
                      <Input
                        id="homeFinalScore"
                        type="number"
                        min="0"
                        value={homeFinalScore}
                        onChange={(e) => setHomeFinalScore(e.target.value)}
                        className="text-center text-2xl font-bold h-14"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-2xl font-bold text-muted-foreground pt-6">:</span>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="awayFinalScore">{awayTeam.Team.shortcut || 'Away'}</Label>
                      <Input
                        id="awayFinalScore"
                        type="number"
                        min="0"
                        value={awayFinalScore}
                        onChange={(e) => setAwayFinalScore(e.target.value)}
                        className="text-center text-2xl font-bold h-14"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Scorers section (T3: Context-Aware Scorer Selection) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Goal Scorers</h4>
                <div className="flex items-center gap-4">
                  {/* No scorers checkbox - Soccer only (hockey always has at least one goal) */}
                  {sportId === SPORT_IDS.FOOTBALL && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="noScorers"
                        checked={!hasScorers}
                        onCheckedChange={(checked) => {
                          setHasScorers(!checked)
                          if (checked) {
                            setScorers([])
                          }
                        }}
                      />
                      <Label htmlFor="noScorers" className="text-sm font-normal cursor-pointer">
                        No scorers (0:0 game)
                      </Label>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddScorer}
                    disabled={!hasScorers}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Scorer
                  </Button>
                </div>
              </div>

              {!hasScorers ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  No scorers recorded for this match (0:0 game).
                </p>
              ) : scorers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scorers added yet. Click "Add Scorer" to record goal scorers.
                </p>
              ) : (
                <div className="space-y-3">
                  {scorers.map((scorer, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={scorer.playerId}
                        onValueChange={(value) => handleScorerChange(index, 'playerId', value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Home team players */}
                          <SelectGroup>
                            <SelectLabel>{homeTeam.Team.name}</SelectLabel>
                            {players.home.map((lp) => (
                              <SelectItem key={lp.id} value={lp.id.toString()}>
                                {lp.Player.firstName} {lp.Player.lastName}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          {/* Away team players */}
                          <SelectGroup>
                            <SelectLabel>{awayTeam.Team.name}</SelectLabel>
                            {players.away.map((lp) => (
                              <SelectItem key={lp.id} value={lp.id.toString()}>
                                {lp.Player.firstName} {lp.Player.lastName}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        value={scorer.numberOfGoals}
                        onChange={(e) =>
                          handleScorerChange(index, 'numberOfGoals', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-16 text-center"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveScorer(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Match info badges */}
            <div className="flex flex-wrap gap-2">
              {match.Match.isPlayoffGame && (
                <Badge variant="warning">Playoff Game</Badge>
              )}
              {match.isDoubled && (
                <Badge variant="default">Double Points</Badge>
              )}
              {match.Match.isEvaluated && (
                <Badge variant="evaluated">Evaluated</Badge>
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
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
