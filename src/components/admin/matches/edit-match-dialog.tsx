'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateMatch } from '@/actions/matches'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
}

interface LeagueTeam {
  id: number
  Team: Team
}

interface MatchPhase {
  id: number
  name: string
  rank: number
  bestOf: number | null
}

interface Match {
  id: number
  dateTime: Date
  matchPhaseId: number | null
  gameNumber: number | null
  isPlayoffGame: boolean
  LeagueTeam_Match_homeTeamIdToLeagueTeam: LeagueTeam
  LeagueTeam_Match_awayTeamIdToLeagueTeam: LeagueTeam
  MatchPhase?: MatchPhase | null
}

interface LeagueMatch {
  id: number
  isDoubled: boolean | null
  Match: Match
}

interface EditMatchDialogProps {
  match: LeagueMatch
  open: boolean
  onOpenChange: (open: boolean) => void
  phases: MatchPhase[]
}

export function EditMatchDialog({
  match,
  open,
  onOpenChange,
  phases,
}: EditMatchDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [dateTime, setDateTime] = React.useState<string>(() => {
    // Convert UTC date to local datetime-local format
    const date = new Date(match.Match.dateTime)
    return format(date, "yyyy-MM-dd'T'HH:mm")
  })
  const [selectedPhaseId, setSelectedPhaseId] = React.useState<string>(
    match.Match.matchPhaseId?.toString() || ''
  )
  const [gameNumber, setGameNumber] = React.useState<string>(
    match.Match.gameNumber?.toString() || ''
  )

  const selectedPhase = phases.find((p) => p.id.toString() === selectedPhaseId)
  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dateTime) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      await updateMatch({
        matchId: match.Match.id,
        dateTime: new Date(dateTime),
        matchPhaseId: selectedPhaseId ? parseInt(selectedPhaseId, 10) : null,
        gameNumber: gameNumber ? parseInt(gameNumber, 10) : null,
      })

      toast.success('Match updated successfully')
      onOpenChange(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update match')
      }
      logger.error('Failed to update match', { error, matchId: match.Match.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Match</DialogTitle>
          <DialogDescription>
            Update match date/time and tournament phase for {homeTeam.Team.name} vs{' '}
            {awayTeam.Team.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="matchPhase">Match Phase (Optional)</Label>
            <Select
              value={selectedPhaseId || undefined}
              onValueChange={(value) => setSelectedPhaseId(value || '')}
            >
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
              {isSubmitting ? 'Updating...' : 'Update Match'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
