'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { updateSpecialBetResult, type SpecialBetWithDetails } from '@/actions/special-bets'
import { evaluateSpecialBetBets } from '@/actions/evaluate-special-bets'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { getSpecialBetType } from '@/lib/special-bet-utils'
import { type LeagueWithTeams } from '@/actions/shared-queries'

type SpecialBet = SpecialBetWithDetails
type League = LeagueWithTeams

interface ResultEntryDialogProps {
  specialBet: SpecialBet
  leagues: League[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResultEntryDialog({ specialBet, leagues, open, onOpenChange }: ResultEntryDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isEvaluating, setIsEvaluating] = React.useState(false)

  // Determine type from special bet definition
  const resultType = getSpecialBetType(specialBet.SpecialBetSingle.SpecialBetSingleType.id)
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>(
    specialBet.specialBetTeamResultId?.toString() ?? ''
  )
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string>(
    specialBet.specialBetPlayerResultId?.toString() ?? ''
  )
  const [valueResult, setValueResult] = React.useState<string>(
    specialBet.specialBetValue?.toString() ?? ''
  )

  // Get teams and players from the selected league
  const league = leagues.find((l) => l.id === specialBet.leagueId)
  const availableTeams = league?.LeagueTeam || []

  // Flatten all players from all teams
  const availablePlayers = availableTeams.flatMap((lt) =>
    (lt.LeaguePlayer || []).map((lp) => ({ ...lp, teamName: lt.Team.name }))
  )

  const handleSaveResult = async () => {
    // Validate based on result type
    if (resultType === 'team' && !selectedTeamId) {
      toast.error('Please select a team')
      return
    }
    if (resultType === 'player' && !selectedPlayerId) {
      toast.error('Please select a player')
      return
    }
    if (resultType === 'value' && !valueResult) {
      toast.error('Please enter a value')
      return
    }

    setIsSubmitting(true)

    try {
      await updateSpecialBetResult({
        specialBetId: specialBet.id,
        specialBetTeamResultId: resultType === 'team' ? parseInt(selectedTeamId, 10) : undefined,
        specialBetPlayerResultId: resultType === 'player' ? parseInt(selectedPlayerId, 10) : undefined,
        specialBetValue: resultType === 'value' ? parseInt(valueResult, 10) : undefined,
      })

      toast.success('Special bet result saved successfully')
      // Keep dialog open so user can evaluate if needed
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to save special bet result')
      }
      logger.error('Failed to save special bet result', { error, specialBetId: specialBet.id })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEvaluate = async () => {
    // Check if result is saved based on type
    const hasResult =
      (resultType === 'team' && specialBet.specialBetTeamResultId) ||
      (resultType === 'player' && specialBet.specialBetPlayerResultId) ||
      (resultType === 'value' && specialBet.specialBetValue !== null)

    if (!hasResult) {
      toast.error('Please save special bet result before evaluating')
      return
    }

    setIsEvaluating(true)

    try {
      const result = await evaluateSpecialBetBets({ specialBetId: specialBet.id })

      if (result.success && 'results' in result) {
        const betsCount = result.results?.length ?? 0
        toast.success(`Special bet evaluated! ${betsCount} bets scored.`)
        onOpenChange(false)
      } else if (!result.success) {
        toast.error('error' in result ? result.error : 'Failed to evaluate special bet')
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to evaluate special bet')
      }
      logger.error('Failed to evaluate special bet', { error, specialBetId: specialBet.id })
    } finally {
      setIsEvaluating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Special Bet Result Entry</DialogTitle>
          <DialogDescription>
            {specialBet.League.name} - {specialBet.SpecialBetSingle.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Special Bet Info */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Deadline: {format(new Date(specialBet.dateTime), 'MMM d, yyyy HH:mm')}
              </span>
              {specialBet.isEvaluated && (
                <Badge variant="evaluated">Evaluated</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{specialBet.SpecialBetSingle.name}</span>
              <span className="text-sm text-muted-foreground">{specialBet.points} points</span>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {specialBet._count.UserSpecialBetSingle} user prediction{specialBet._count.UserSpecialBetSingle !== 1 ? 's' : ''}
            </div>
          </div>

          <Separator />

          {/* Result Type (read-only, defined by special bet) */}
          <div className="space-y-2">
            <Label>Result Type</Label>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">
                {specialBet.SpecialBetSingle.SpecialBetSingleType.name}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Type is defined by the special bet template and cannot be changed
              </p>
            </div>
          </div>

          {/* Conditional Result Input */}
          {resultType === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="teamResult">Select Team</Label>
              <Select
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
                disabled={specialBet.isEvaluated}
              >
                <SelectTrigger id="teamResult">
                  <SelectValue placeholder="Select winning team" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id.toString()}>
                      {lt.Team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {resultType === 'player' && (
            <div className="space-y-2">
              <Label htmlFor="playerResult">Select Player</Label>
              <Select
                value={selectedPlayerId}
                onValueChange={setSelectedPlayerId}
                disabled={specialBet.isEvaluated}
              >
                <SelectTrigger id="playerResult">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((lp) => (
                    <SelectItem key={lp.id} value={lp.id.toString()}>
                      {lp.Player.firstName} {lp.Player.lastName} ({lp.teamName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {resultType === 'value' && (
            <div className="space-y-2">
              <Label htmlFor="valueResult">Enter Value</Label>
              <Input
                id="valueResult"
                type="number"
                value={valueResult}
                onChange={(e) => setValueResult(e.target.value)}
                disabled={specialBet.isEvaluated}
                placeholder="Enter numeric value"
                aria-label="Numeric result value"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isEvaluating}
          >
            Close
          </Button>

          {!specialBet.isEvaluated && (
            <>
              <Button
                onClick={handleSaveResult}
                disabled={isSubmitting || isEvaluating}
              >
                {isSubmitting ? 'Saving...' : 'Save Result'}
              </Button>

              <Button
                onClick={handleEvaluate}
                disabled={isSubmitting || isEvaluating}
                variant="default"
              >
                {isEvaluating ? 'Evaluating...' : 'Save & Evaluate'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
