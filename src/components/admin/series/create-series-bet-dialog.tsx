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
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { createUserSeriesBet, type SeriesWithUserBets } from '@/actions/series-bets'
import { validate } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { UserSelectorInput } from '@/components/admin/bets/shared/user-selector-input'

type SeriesWithBets = SeriesWithUserBets

interface CreateSeriesBetFormData {
  leagueUserId: string
  homeTeamScore: string
  awayTeamScore: string
}

interface CreateSeriesBetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  series: SeriesWithBets
}

const initialFormData: CreateSeriesBetFormData = {
  leagueUserId: '',
  homeTeamScore: '4',
  awayTeamScore: '0',
}

export function CreateSeriesBetDialog({ open, onOpenChange, series }: CreateSeriesBetDialogProps) {
  const createDialog = useCreateDialog<CreateSeriesBetFormData>(initialFormData)

  const homeTeam = series.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team
  const awayTeam = series.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team
  const bestOf = series.SpecialBetSerie.bestOf
  const gamesRequired = Math.ceil(bestOf / 2)

  // Get IDs of users who already have bets
  const existingBetUserIds = series.UserSpecialBetSerie.map((bet) => bet.leagueUserId)

  const handleSubmit = async () => {
    // Convert form data to proper types for validation
    const validationData = {
      leagueSpecialBetSerieId: series.id,
      leagueUserId: parseInt(createDialog.form.leagueUserId),
      homeTeamScore: parseInt(createDialog.form.homeTeamScore),
      awayTeamScore: parseInt(createDialog.form.awayTeamScore),
    }

    const validation = validate.userSeriesBetCreate(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    createDialog.startCreating()
    const result = await createUserSeriesBet(validation.data)

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
            Create a prediction for a user who hasn&apos;t placed a bet on this series yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Note about implementation */}
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Series: {homeTeam.name} vs {awayTeam.name}</p>
            <p className="text-xs">
              {series.SpecialBetSerie.name} (Best of {bestOf}) - First to {gamesRequired} wins
            </p>
          </div>

          {/* User selection */}
          <UserSelectorInput
            value={createDialog.form.leagueUserId}
            onChange={(value) => createDialog.updateForm({ leagueUserId: value })}
            leagueId={series.leagueId}
            existingBetUserIds={existingBetUserIds}
          />

          {/* Score inputs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeScore">{homeTeam.shortcut} Wins</Label>
              <Input
                id="homeScore"
                type="number"
                min="0"
                max="7"
                value={createDialog.form.homeTeamScore}
                onChange={(e) => createDialog.updateForm({ homeTeamScore: e.target.value })}
                aria-label={`${homeTeam.name} wins`}
              />
            </div>
            <div className="flex items-end justify-center pb-2">
              <span className="text-2xl">:</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayScore">{awayTeam.shortcut} Wins</Label>
              <Input
                id="awayScore"
                type="number"
                min="0"
                max="7"
                value={createDialog.form.awayTeamScore}
                onChange={(e) => createDialog.updateForm({ awayTeamScore: e.target.value })}
                aria-label={`${awayTeam.name} wins`}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            At least one team must have {gamesRequired} wins
          </p>
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
