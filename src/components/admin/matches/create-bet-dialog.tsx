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
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { createUserBet, type MatchWithUserBets } from '@/actions/user-bets'
import { validateUserBetCreate } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { UserSelectorInput } from '@/components/admin/bets/shared/user-selector-input'

type MatchWithBets = MatchWithUserBets
type LeaguePlayer = { id: number; Player: { id: number; firstName: string | null; lastName: string | null } }

interface CreateBetFormData {
  leagueUserId: string
  homeScore: string
  awayScore: string
  scorerId: string
  noScorer: boolean
  overtime: boolean
  homeAdvanced: string // 'home' | 'away' | 'none'
}

interface CreateBetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  match: MatchWithBets
  availablePlayers: LeaguePlayer[]
}

const initialFormData: CreateBetFormData = {
  leagueUserId: '',
  homeScore: '0',
  awayScore: '0',
  scorerId: 'none',
  noScorer: false,
  overtime: false,
  homeAdvanced: 'none',
}

export function CreateBetDialog({ open, onOpenChange, match, availablePlayers }: CreateBetDialogProps) {
  const createDialog = useCreateDialog<CreateBetFormData>(initialFormData)

  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team

  // Get IDs of users who already have bets
  const existingBetUserIds = match.UserBet.map((bet) => bet.LeagueUser.id)

  const handleSubmit = async () => {
    // Convert form data to proper types for validation
    const validationData = {
      leagueMatchId: match.id,
      leagueUserId: parseInt(createDialog.form.leagueUserId),
      homeScore: parseInt(createDialog.form.homeScore),
      awayScore: parseInt(createDialog.form.awayScore),
      scorerId: createDialog.form.scorerId !== 'none' ? parseInt(createDialog.form.scorerId) : undefined,
      noScorer: createDialog.form.noScorer || undefined,
      overtime: createDialog.form.overtime,
      homeAdvanced:
        createDialog.form.homeAdvanced === 'none'
          ? undefined
          : createDialog.form.homeAdvanced === 'home',
    }

    const validation = validateUserBetCreate(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    createDialog.startCreating()
    const result = await createUserBet(validation.data)

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
            Create a prediction for a user who hasn&apos;t placed a bet on this match yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User selection */}
          <UserSelectorInput
            value={createDialog.form.leagueUserId}
            onChange={(value) => createDialog.updateForm({ leagueUserId: value })}
            leagueId={match.leagueId}
            existingBetUserIds={existingBetUserIds}
          />

          {/* Score inputs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeScore">{homeTeam.shortcut} Score</Label>
              <Input
                id="homeScore"
                type="number"
                min="0"
                value={createDialog.form.homeScore}
                onChange={(e) => createDialog.updateForm({ homeScore: e.target.value })}
                aria-label="Home team score"
              />
            </div>
            <div className="flex items-end justify-center pb-2">
              <span className="text-2xl">:</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayScore">{awayTeam.shortcut} Score</Label>
              <Input
                id="awayScore"
                type="number"
                min="0"
                value={createDialog.form.awayScore}
                onChange={(e) => createDialog.updateForm({ awayScore: e.target.value })}
                aria-label="Away team score"
              />
            </div>
          </div>

          {/* Scorer selection */}
          <div className="space-y-2">
            <Label htmlFor="scorer">Scorer (optional)</Label>
            <Select
              value={createDialog.form.scorerId}
              onValueChange={(value) => createDialog.updateForm({ scorerId: value })}
              disabled={createDialog.form.noScorer}
            >
              <SelectTrigger id="scorer" aria-label="Select scorer">
                <SelectValue placeholder="No scorer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No scorer</SelectItem>
                {availablePlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id.toString()}>
                    {player.Player.firstName} {player.Player.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* No Scorer checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="noScorer"
              checked={createDialog.form.noScorer}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                createDialog.updateForm({
                  noScorer: isChecked,
                  scorerId: isChecked ? 'none' : createDialog.form.scorerId
                })
              }}
            />
            <Label htmlFor="noScorer" className="text-sm font-normal cursor-pointer">
              No Scorer (0:0 game)
            </Label>
          </div>

          {/* Overtime checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overtime"
              checked={createDialog.form.overtime}
              onCheckedChange={(checked) =>
                createDialog.updateForm({ overtime: checked === true })
              }
            />
            <Label htmlFor="overtime" className="text-sm font-normal">
              Overtime prediction
            </Label>
          </div>

          {/* Advanced (playoff) */}
          {match.Match.isPlayoffGame && (
            <div className="space-y-2">
              <Label>Team to advance (playoff)</Label>
              <RadioGroup
                value={createDialog.form.homeAdvanced}
                onValueChange={(value) => createDialog.updateForm({ homeAdvanced: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="home" id="home-create" />
                  <Label htmlFor="home-create" className="font-normal">
                    {homeTeam.name}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="away" id="away-create" />
                  <Label htmlFor="away-create" className="font-normal">
                    {awayTeam.name}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none-create" />
                  <Label htmlFor="none-create" className="font-normal">
                    None
                  </Label>
                </div>
              </RadioGroup>
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
