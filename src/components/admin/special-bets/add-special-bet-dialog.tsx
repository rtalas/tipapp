'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { createSpecialBet } from '@/actions/special-bets'
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

type League = {
  id: number
  name: string
  LeagueTeam?: Array<{ id: number; group: string | null; Team: { name: string } }>
}
type Evaluator = { id: number; name: string; EvaluatorType?: { name: string } }

interface AddSpecialBetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagues: League[]
  evaluators: Evaluator[]
  league?: League
}

export function AddSpecialBetDialog({ open, onOpenChange, leagues, evaluators, league }: AddSpecialBetDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(league?.id.toString() || '')
  const [name, setName] = useState<string>('')
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [dateTime, setDateTime] = useState<string>('')

  const effectiveLeagueId = league?.id.toString() || selectedLeagueId

  // Get the selected league to access its teams
  const selectedLeague = leagues.find((l) => l.id === parseInt(effectiveLeagueId))

  // Get unique groups from teams in the selected league
  const availableGroups = selectedLeague?.LeagueTeam
    ? Array.from(
        new Set(
          selectedLeague.LeagueTeam
            .map((lt) => lt.group)
            .filter((g): g is string => g !== null)
        )
      )
    : []

  // Check if selected evaluator is group_stage_team
  const selectedEvaluator = evaluators.find((e) => e.id === parseInt(selectedEvaluatorId))
  const isGroupStageEvaluator = selectedEvaluator?.EvaluatorType?.name === 'group_stage_team'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveLeagueId || !name.trim() || !selectedEvaluatorId || !dateTime) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate group selection for group_stage_team evaluator
    if (isGroupStageEvaluator && !selectedGroup) {
      toast.error('Please select a group for group stage prediction')
      return
    }

    setIsSubmitting(true)

    try {
      await createSpecialBet({
        leagueId: parseInt(effectiveLeagueId, 10),
        name: name.trim(),
        evaluatorId: parseInt(selectedEvaluatorId, 10),
        dateTime: new Date(dateTime),
        group: selectedGroup || undefined,
      })

      toast.success('Special bet created successfully')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create special bet')
      }
      logger.error('Failed to create special bet', { error, leagueId: effectiveLeagueId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    if (!league) {
      setSelectedLeagueId('')
    }
    setName('')
    setSelectedEvaluatorId('')
    setSelectedGroup('')
    setDateTime('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Special Bet</DialogTitle>
          <DialogDescription>
            Add a new special bet to a league (e.g., Tournament Winner, Top Scorer).
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
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Top Scorer, Tournament Winner"
              required
            />
            <p className="text-xs text-muted-foreground">
              The display name for this special bet.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evaluator">Evaluator</Label>
            <Select value={selectedEvaluatorId} onValueChange={setSelectedEvaluatorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select evaluator" />
              </SelectTrigger>
              <SelectContent>
                {evaluators.map((evaluator) => (
                  <SelectItem key={evaluator.id} value={evaluator.id.toString()}>
                    {evaluator.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines which evaluator type (team/player/value) and points are awarded.
            </p>
          </div>

          {isGroupStageEvaluator && (
            <div className="space-y-2">
              <Label htmlFor="group">Group (Required)</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup} required>
                <SelectTrigger id="group">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.length > 0 ? (
                    availableGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-groups" disabled>
                      No groups available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Users will only see teams from this group when making predictions.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dateTime">Deadline Date & Time (UTC)</Label>
            <Input
              id="dateTime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Users must submit predictions before this time.
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
              {isSubmitting ? 'Creating...' : 'Create Special Bet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
