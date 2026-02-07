'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createMatch } from '@/actions/matches'
import { logger } from '@/lib/logging/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { TeamFlag } from '@/components/common/team-flag'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Team {
  id: number
  name: string
  shortcut: string
  flagIcon: string | null
  flagType: string | null
}

interface LeagueTeam {
  id: number
  Team: Team
}

interface League {
  id: number
  name: string
  LeagueTeam: LeagueTeam[]
}

interface MatchPhase {
  id: number
  name: string
  rank: number
  bestOf: number | null
}

interface AddMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagues: League[]
  league?: { id: number; name: string }
  phases: MatchPhase[]
}

export function AddMatchDialog({ open, onOpenChange, leagues, league, phases }: AddMatchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(league?.id.toString() || '')
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState<string>('')
  const [selectedAwayTeamId, setSelectedAwayTeamId] = useState<string>('')
  const [dateTime, setDateTime] = useState<string>('')
  const [isPlayoffGame, setIsPlayoffGame] = useState(false)
  const [isDoubled, setIsDoubled] = useState(false)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('')
  const [gameNumber, setGameNumber] = useState<string>('')

  // Get teams for selected league (from prop or from selection)
  const effectiveLeagueId = league?.id.toString() || selectedLeagueId
  const selectedLeague = leagues.find((l) => l.id.toString() === effectiveLeagueId)
  const availableTeams = selectedLeague?.LeagueTeam || []

  // Get selected phase
  const selectedPhase = phases.find((p) => p.id.toString() === selectedPhaseId)

  // Filter out selected teams from each other's options
  const homeTeamOptions = availableTeams.filter(
    (lt) => lt.id.toString() !== selectedAwayTeamId
  )
  const awayTeamOptions = availableTeams.filter(
    (lt) => lt.id.toString() !== selectedHomeTeamId
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveLeagueId || !selectedHomeTeamId || !selectedAwayTeamId || !dateTime) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      await createMatch({
        leagueId: parseInt(effectiveLeagueId, 10),
        homeTeamId: parseInt(selectedHomeTeamId, 10),
        awayTeamId: parseInt(selectedAwayTeamId, 10),
        dateTime: new Date(dateTime),
        isPlayoffGame,
        isDoubled,
        matchPhaseId: selectedPhaseId ? parseInt(selectedPhaseId, 10) : null,
        gameNumber: gameNumber ? parseInt(gameNumber, 10) : null,
      })

      toast.success('Match created successfully')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create match')
      }
      logger.error('Failed to create match', { error, leagueId: effectiveLeagueId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    if (!league) {
      setSelectedLeagueId('')
    }
    setSelectedHomeTeamId('')
    setSelectedAwayTeamId('')
    setDateTime('')
    setIsPlayoffGame(false)
    setIsDoubled(false)
    setSelectedPhaseId('')
    setGameNumber('')
  }

  // Reset team selections when league changes (only for manual selection)
  useEffect(() => {
    if (!league) {
      setSelectedHomeTeamId('')
      setSelectedAwayTeamId('')
    }
  }, [selectedLeagueId, league])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Match</DialogTitle>
          <DialogDescription>
            Add a new match to a league. Select the teams and schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!league && (
            <div className="space-y-2">
              <Label htmlFor="league">League</Label>
              <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a league" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id.toString()}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeTeam">Home Team</Label>
              <Select
                value={selectedHomeTeamId}
                onValueChange={setSelectedHomeTeamId}
                disabled={!effectiveLeagueId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {homeTeamOptions.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id.toString()}>
                      <div className="flex items-center gap-2">
                        <TeamFlag
                          flagIcon={lt.Team.flagIcon}
                          flagType={lt.Team.flagType}
                          teamName={lt.Team.name}
                          size="sm"
                        />
                        <span>{lt.Team.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="awayTeam">Away Team</Label>
              <Select
                value={selectedAwayTeamId}
                onValueChange={setSelectedAwayTeamId}
                disabled={!effectiveLeagueId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {awayTeamOptions.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id.toString()}>
                      <div className="flex items-center gap-2">
                        <TeamFlag
                          flagIcon={lt.Team.flagIcon}
                          flagType={lt.Team.flagType}
                          teamName={lt.Team.name}
                          size="sm"
                        />
                        <span>{lt.Team.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTime">Date & Time (UTC)</Label>
            <Input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the match time in UTC. It will be displayed in local timezone.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPlayoffGame"
                checked={isPlayoffGame}
                onCheckedChange={(checked) => setIsPlayoffGame(checked === true)}
              />
              <Label htmlFor="isPlayoffGame" className="text-sm font-normal">
                Playoff Game
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDoubled"
                checked={isDoubled}
                onCheckedChange={(checked) => setIsDoubled(checked === true)}
              />
              <Label htmlFor="isDoubled" className="text-sm font-normal">
                Double Points
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchPhase">Match Phase (Optional)</Label>
            <Select value={selectedPhaseId || undefined} onValueChange={(value) => setSelectedPhaseId(value || '')}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id.toString()}>
                    {phase.name} {phase.bestOf ? `(Best of ${phase.bestOf})` : '(Single)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPhase?.bestOf && selectedPhase.bestOf > 1 && (
            <div className="space-y-2">
              <Label htmlFor="gameNumber">Game Number</Label>
              <Input
                id="gameNumber"
                type="number"
                min="1"
                max={selectedPhase.bestOf}
                value={gameNumber}
                onChange={(e) => setGameNumber(e.target.value)}
                placeholder={`1-${selectedPhase.bestOf}`}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Match'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
