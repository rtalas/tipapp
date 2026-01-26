'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createSeries } from '@/actions/series'
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

interface League {
  id: number
  name: string
  LeagueTeam: LeagueTeam[]
}

interface SpecialBetSerie {
  id: number
  name: string
  bestOf: number
}

interface AddSeriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagues: League[]
  specialBetSeries: SpecialBetSerie[]
  league?: { id: number; name: string }
}

export function AddSeriesDialog({ open, onOpenChange, leagues, specialBetSeries, league }: AddSeriesDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(league?.id.toString() || '')
  const [selectedSeriesTypeId, setSelectedSeriesTypeId] = useState<string>('')
  const [selectedHomeTeamId, setSelectedHomeTeamId] = useState<string>('')
  const [selectedAwayTeamId, setSelectedAwayTeamId] = useState<string>('')
  const [dateTime, setDateTime] = useState<string>('')

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

    if (!effectiveLeagueId || !selectedSeriesTypeId || !selectedHomeTeamId || !selectedAwayTeamId || !dateTime) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      await createSeries({
        leagueId: parseInt(effectiveLeagueId, 10),
        specialBetSerieId: parseInt(selectedSeriesTypeId, 10),
        homeTeamId: parseInt(selectedHomeTeamId, 10),
        awayTeamId: parseInt(selectedAwayTeamId, 10),
        dateTime: new Date(dateTime),
      })

      toast.success('Series created successfully')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create series')
      }
      logger.error('Failed to create series', { error, leagueId: effectiveLeagueId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    if (!league) {
      setSelectedLeagueId('')
    }
    setSelectedSeriesTypeId('')
    setSelectedHomeTeamId('')
    setSelectedAwayTeamId('')
    setDateTime('')
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
          <DialogTitle>Create Series</DialogTitle>
          <DialogDescription>
            Add a new playoff series to a league. Select the teams and schedule.
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

          <div className="space-y-2">
            <Label htmlFor="seriesType">Series Type</Label>
            <Select value={selectedSeriesTypeId} onValueChange={setSelectedSeriesTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select series type" />
              </SelectTrigger>
              <SelectContent>
                {specialBetSeries.map((seriesType) => (
                  <SelectItem key={seriesType.id} value={seriesType.id.toString()}>
                    {seriesType.name} (Best of {seriesType.bestOf})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="dateTime">Start Date & Time (UTC)</Label>
            <Input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the series start time in UTC. It will be displayed in local timezone.
            </p>
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
              {isSubmitting ? 'Creating...' : 'Create Series'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
