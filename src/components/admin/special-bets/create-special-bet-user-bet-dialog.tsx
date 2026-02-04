'use client'

import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { createUserSpecialBet, type SpecialBetWithUserBets } from '@/actions/special-bet-bets'
import { type LeagueWithTeams } from '@/actions/shared-queries'
import { validateUserSpecialBetCreate } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { getSpecialBetTypeFromEvaluator } from '@/lib/special-bet-utils'
import { UserSelectorInput } from '@/components/admin/bets/shared/user-selector-input'

type SpecialBetWithBets = SpecialBetWithUserBets

interface CreateSpecialBetFormData {
  leagueUserId: string
  teamResultId: string
  playerResultId: string
  value: string
}

interface CreateSpecialBetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  specialBet: SpecialBetWithBets
  league?: LeagueWithTeams
}

const initialFormData: CreateSpecialBetFormData = {
  leagueUserId: '',
  teamResultId: '',
  playerResultId: '',
  value: '',
}

export function CreateSpecialBetUserBetDialog({ open, onOpenChange, specialBet, league }: CreateSpecialBetDialogProps) {
  const createDialog = useCreateDialog<CreateSpecialBetFormData>(initialFormData)

  // Determine type from evaluator type
  const evaluatorTypeName = specialBet.Evaluator?.EvaluatorType?.name || ''
  const predictionType = getSpecialBetTypeFromEvaluator(evaluatorTypeName)

  // Get teams and players from the league
  const availableTeams = league?.LeagueTeam || []
  const availablePlayers = availableTeams.flatMap((lt) =>
    (lt.LeaguePlayer || []).map((lp) => ({ ...lp, teamName: lt.Team.name }))
  )

  // Get IDs of users who already have bets
  const existingBetUserIds = specialBet.UserSpecialBetSingle.map((bet) => bet.leagueUserId)

  const handleSubmit = async () => {
    // Build validation data based on prediction type (from special bet definition)
    const validationData: {
      leagueSpecialBetSingleId: number
      leagueUserId: number
      teamResultId?: number
      playerResultId?: number
      value?: number
    } = {
      leagueSpecialBetSingleId: specialBet.id,
      leagueUserId: parseInt(createDialog.form.leagueUserId),
    }

    if (predictionType === 'team') {
      if (!createDialog.form.teamResultId) {
        toast.error('Please select a team')
        return
      }
      validationData.teamResultId = parseInt(createDialog.form.teamResultId, 10)
    } else if (predictionType === 'player') {
      if (!createDialog.form.playerResultId) {
        toast.error('Please select a player')
        return
      }
      validationData.playerResultId = parseInt(createDialog.form.playerResultId, 10)
    } else if (predictionType === 'value') {
      if (!createDialog.form.value) {
        toast.error('Please enter a value')
        return
      }
      validationData.value = parseInt(createDialog.form.value, 10)
    }

    const validation = validateUserSpecialBetCreate(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    createDialog.startCreating()
    const result = await createUserSpecialBet(validation.data)

    if (result.success) {
      toast.success('Bet created successfully')
      createDialog.finishCreating()
      onOpenChange(false)
    } else {
      toast.error(getErrorMessage('error' in result ? result.error : undefined, 'Failed to create bet'))
      createDialog.cancelCreating()
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      createDialog.closeDialog()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Missing Bet</DialogTitle>
          <DialogDescription>
            Create a prediction for a user who hasn&apos;t placed a bet on this special bet yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Special bet info */}
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Special Bet: {specialBet.name}</p>
            <p className="text-xs">
              {specialBet.League.name} - {specialBet.points} points
            </p>
          </div>

          {/* User selection */}
          <UserSelectorInput
            value={createDialog.form.leagueUserId}
            onChange={(value) => createDialog.updateForm({ leagueUserId: value })}
            leagueId={specialBet.leagueId}
            existingBetUserIds={existingBetUserIds}
          />

          {/* Prediction type (read-only, defined by special bet) */}
          <div className="space-y-2">
            <Label>Prediction Type</Label>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <span className="font-medium">
                {specialBet.Evaluator?.EvaluatorType?.name || 'Unknown'}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Type is defined by the special bet template
              </p>
            </div>
          </div>

          {/* Conditional prediction input */}
          {predictionType === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="teamResult">Select Team</Label>
              <Select
                value={createDialog.form.teamResultId}
                onValueChange={(value) => createDialog.updateForm({ teamResultId: value })}
              >
                <SelectTrigger id="teamResult">
                  <SelectValue placeholder="Select team" />
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

          {predictionType === 'player' && (
            <div className="space-y-2">
              <Label htmlFor="playerResult">Select Player</Label>
              <Select
                value={createDialog.form.playerResultId}
                onValueChange={(value) => createDialog.updateForm({ playerResultId: value })}
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

          {predictionType === 'value' && (
            <div className="space-y-2">
              <Label htmlFor="valueResult">Enter Value</Label>
              <Input
                id="valueResult"
                type="number"
                value={createDialog.form.value}
                onChange={(e) => createDialog.updateForm({ value: e.target.value })}
                placeholder="Enter numeric value"
                aria-label="Numeric prediction value"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createDialog.isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createDialog.isCreating}>
            {createDialog.isCreating ? 'Creating...' : 'Create Bet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
