'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { createMatch } from '@/actions/matches'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Team {
  id: number
  name: string
  shortcut: string
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

interface AddMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagues: League[]
  league?: { id: number; name: string }
}

export function AddMatchDialog({ open, onOpenChange, leagues, league }: AddMatchDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = React.useState<string>(league?.id.toString() || '')
  const [selectedHomeTeamId, setSelectedHomeTeamId] = React.useState<string>('')
  const [selectedAwayTeamId, setSelectedAwayTeamId] = React.useState<string>('')
  const [dateTime, setDateTime] = React.useState<string>('')
  const [isPlayoffGame, setIsPlayoffGame] = React.useState(false)
  const [isDoubled, setIsDoubled] = React.useState(false)

  // Get teams for selected league (from prop or from selection)
  const effectiveLeagueId = league?.id.toString() || selectedLeagueId
  const selectedLeague = leagues.find((l) => l.id.toString() === effectiveLeagueId)
  const availableTeams = selectedLeague?.LeagueTeam || []

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
  }

  // Reset team selections when league changes (only for manual selection)
  React.useEffect(() => {
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
                      {lt.Team.name}
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
                      {lt.Team.name}
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
