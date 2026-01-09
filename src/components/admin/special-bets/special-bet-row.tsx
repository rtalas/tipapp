'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Prisma } from '@prisma/client'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { updateUserSpecialBet, deleteUserSpecialBet, type UserSpecialBet, type SpecialBetWithUserBets } from '@/actions/special-bet-bets'
import { evaluateSpecialBetBets } from '@/actions/evaluate-special-bets'
import { validateUserSpecialBetEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { getSpecialBetType } from '@/lib/special-bet-utils'
import { BetRowActions } from '@/components/admin/bets/shared/bet-row-actions'
import { BetRowDeleteDialog } from '@/components/admin/bets/shared/bet-row-delete-dialog'
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
  specialBet: SpecialBetWithUserBets
  league?: LeagueWithTeams
  isEvaluated: boolean
  specialBetId: number
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

export function SpecialBetRow({ bet, specialBet, league, isEvaluated, specialBetId }: SpecialBetRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const inlineEdit = useInlineEdit<UserSpecialBetFormData>()

  // Determine type from special bet definition
  const predictionType = getSpecialBetType(specialBet.SpecialBetSingle.SpecialBetSingleType.id)

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

  const handleEvaluate = async () => {
    try {
      const result = await evaluateSpecialBetBets({
        specialBetId,
        userId: bet.LeagueUser.userId, // Evaluate only this user
      })

      if (result.success) {
        const userResult = result.results[0]
        toast.success(`Bet evaluated! ${userResult.totalPoints} points awarded.`)
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to evaluate bet'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate bet'))
      console.error(error)
    }
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
          <BetRowActions
            isEditing={isEditing}
            isSaving={inlineEdit.isSaving}
            userName={userName}
            onStartEdit={handleStartEdit}
            onCancelEdit={inlineEdit.cancelEdit}
            onSaveEdit={handleSaveEdit}
            onDelete={() => setDeleteDialogOpen(true)}
            onEvaluate={handleEvaluate}
          />
        </TableCell>
      </TableRow>

      {/* Delete confirmation dialog */}
      <BetRowDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        userName={userName}
        isDeleting={isDeleting}
        isEvaluated={isEvaluated}
        entityType="Special bet"
      />
    </>
  )
}
