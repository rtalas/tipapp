'use client'

import { useState } from 'react'
import { Edit, Trash2, Check, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Prisma } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { updateUserSpecialBet, deleteUserSpecialBet } from '@/actions/special-bet-bets'
import { validateUserSpecialBetEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'

type UserSpecialBet = Awaited<ReturnType<typeof import('@/actions/special-bet-bets').getSpecialBetsWithUserBets>>[number]['UserSpecialBetSingle'][number]
type SpecialBetWithBets = Awaited<ReturnType<typeof import('@/actions/special-bet-bets').getSpecialBetsWithUserBets>>[number]
type LeagueWithTeams = Prisma.LeagueGetPayload<{
  include: {
    LeagueTeam: {
      include: {
        Team: true
        LeaguePlayer: {
          include: { Player: true }
        }
      }
    }
  }
}>

interface UserSpecialBetFormData {
  teamResultId: string
  playerResultId: string
  value: string
}

interface SpecialBetRowProps {
  bet: UserSpecialBet
  specialBet: SpecialBetWithBets
  league?: LeagueWithTeams
  isEvaluated: boolean
}

// Helper to determine prediction type from special bet definition
function getPredictionType(specialBet: SpecialBetWithBets): 'team' | 'player' | 'value' {
  const typeId = specialBet.SpecialBetSingle.SpecialBetSingleType.id
  // Type IDs: 1=Player, 2=Team, 3=Exact Value, 4=Closest Value
  if (typeId === 2) return 'team'
  if (typeId === 1) return 'player'
  return 'value'
}

function getPredictionDisplay(bet: UserSpecialBet): string {
  if (bet.teamResultId && bet.LeagueTeam) {
    return bet.LeagueTeam.Team.name
  }
  if (bet.playerResultId && bet.LeaguePlayer) {
    const player = bet.LeaguePlayer.Player
    return `${player.firstName} ${player.lastName}`
  }
  if (bet.value !== null) {
    return bet.value.toString()
  }
  return '-'
}

export function SpecialBetRow({ bet, specialBet, league, isEvaluated }: SpecialBetRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const inlineEdit = useInlineEdit<UserSpecialBetFormData>()

  // Determine type from special bet definition
  const predictionType = getPredictionType(specialBet)

  // Get teams and players from the league
  const availableTeams = league?.LeagueTeam || []
  const availablePlayers = availableTeams.flatMap((lt) =>
    (lt.LeaguePlayer || []).map((lp) => ({ ...lp, teamName: lt.Team.name }))
  )

  const handleStartEdit = () => {
    inlineEdit.startEdit(bet.id, {
      teamResultId: bet.teamResultId?.toString() ?? '',
      playerResultId: bet.playerResultId?.toString() ?? '',
      value: bet.value?.toString() ?? '',
    })
  }

  const handleSaveEdit = async () => {
    if (!inlineEdit.form) return

    // Build validation data based on prediction type (from special bet definition)
    const validationData: {
      id: number
      teamResultId?: number
      playerResultId?: number
      value?: number
    } = {
      id: bet.id,
    }

    if (predictionType === 'team') {
      if (!inlineEdit.form.teamResultId) {
        toast.error('Please select a team')
        return
      }
      validationData.teamResultId = parseInt(inlineEdit.form.teamResultId, 10)
    } else if (predictionType === 'player') {
      if (!inlineEdit.form.playerResultId) {
        toast.error('Please select a player')
        return
      }
      validationData.playerResultId = parseInt(inlineEdit.form.playerResultId, 10)
    } else if (predictionType === 'value') {
      if (!inlineEdit.form.value) {
        toast.error('Please enter a value')
        return
      }
      validationData.value = parseInt(inlineEdit.form.value, 10)
    }

    const validation = validateUserSpecialBetEdit(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    inlineEdit.setSaving(true)
    const result = await updateUserSpecialBet(validation.data)

    if (result.success) {
      toast.success('Bet updated successfully')
      if (isEvaluated) {
        toast.warning('Special bet is already evaluated. Re-evaluation required.')
      }
      inlineEdit.finishEdit()
    } else {
      toast.error(getErrorMessage(result.error, 'Failed to update bet'))
      inlineEdit.setSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteUserSpecialBet(bet.id)

    if (result.success) {
      toast.success('Bet deleted successfully')
      setDeleteDialogOpen(false)
    } else {
      toast.error(getErrorMessage(result.error, 'Failed to delete bet'))
    }
    setIsDeleting(false)
  }

  const userName = `${bet.LeagueUser.User.firstName} ${bet.LeagueUser.User.lastName}`
  const isEditing = inlineEdit.editingId === bet.id

  return (
    <>
      <TableRow>
        {/* User name */}
        <TableCell>{userName}</TableCell>

        {/* Prediction */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <div className="space-y-2">
              {/* Show input based on special bet type (determined by definition) */}
              {predictionType === 'team' && (
                <Select
                  value={inlineEdit.form.teamResultId}
                  onValueChange={(value) => inlineEdit.updateForm({ teamResultId: value })}
                >
                  <SelectTrigger className="w-[200px]">
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
              )}

              {predictionType === 'player' && (
                <Select
                  value={inlineEdit.form.playerResultId}
                  onValueChange={(value) => inlineEdit.updateForm({ playerResultId: value })}
                >
                  <SelectTrigger className="w-[200px]">
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
              )}

              {predictionType === 'value' && (
                <Input
                  type="number"
                  value={inlineEdit.form.value}
                  onChange={(e) => inlineEdit.updateForm({ value: e.target.value })}
                  className="w-[200px]"
                  placeholder="Enter value"
                  aria-label="Numeric prediction value"
                />
              )}
            </div>
          ) : (
            <span>{getPredictionDisplay(bet)}</span>
          )}
        </TableCell>

        {/* Points */}
        <TableCell>
          <span className="font-medium">{bet.totalPoints}</span>
        </TableCell>

        {/* Actions */}
        <TableCell className="text-right">
          {isEditing ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={inlineEdit.cancelEdit}
                disabled={inlineEdit.isSaving}
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveEdit}
                disabled={inlineEdit.isSaving}
                aria-label="Save bet changes"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                aria-label={`Edit bet for ${userName}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                aria-label={`Delete bet for ${userName}`}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          )}
        </TableCell>
      </TableRow>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the bet for {userName}? This action cannot be undone.
              {isEvaluated && (
                <div className="mt-2 flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Special bet is already evaluated</span>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
