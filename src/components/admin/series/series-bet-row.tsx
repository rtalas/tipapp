'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { updateUserSeriesBet, deleteUserSeriesBet } from '@/actions/series-bets'
import { evaluateSeriesBets } from '@/actions/evaluate-series'
import { validateUserSeriesBetEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { BetRowActions } from '@/components/admin/bets/shared/bet-row-actions'
import { BetRowDeleteDialog } from '@/components/admin/bets/shared/bet-row-delete-dialog'

type UserSeriesBet = Awaited<ReturnType<typeof import('@/actions/series-bets').getSeriesWithUserBets>>[number]['UserSpecialBetSerie'][number]
type Team = { id: number; name: string; shortcut: string }

interface UserSeriesBetFormData {
  homeTeamScore: string
  awayTeamScore: string
}

interface SeriesBetRowProps {
  bet: UserSeriesBet
  seriesHomeTeam: Team
  seriesAwayTeam: Team
  isSeriesEvaluated: boolean
  seriesId: number
}

export function SeriesBetRow({
  bet,
  seriesHomeTeam,
  seriesAwayTeam,
  isSeriesEvaluated,
  seriesId,
}: SeriesBetRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const inlineEdit = useInlineEdit<UserSeriesBetFormData>()

  const handleStartEdit = () => {
    inlineEdit.startEdit(bet.id, {
      homeTeamScore: bet.homeTeamScore?.toString() ?? '0',
      awayTeamScore: bet.awayTeamScore?.toString() ?? '0',
    })
  }

  const handleSaveEdit = async () => {
    // Ensure form exists
    if (!inlineEdit.form) return

    // Convert form data to proper types for validation
    const validationData = {
      id: bet.id,
      homeTeamScore: parseInt(inlineEdit.form.homeTeamScore),
      awayTeamScore: parseInt(inlineEdit.form.awayTeamScore),
    }

    const validation = validateUserSeriesBetEdit(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    inlineEdit.setSaving(true)
    const result = await updateUserSeriesBet(validation.data)

    if (result.success) {
      toast.success('Bet updated successfully')
      if (isSeriesEvaluated) {
        toast.warning('Series is already evaluated. Re-evaluation required.')
      }
      inlineEdit.finishEdit()
    } else {
      toast.error(getErrorMessage(result.error, 'Failed to update bet'))
      inlineEdit.setSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteUserSeriesBet(bet.id)

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
      const result = await evaluateSeriesBets({
        seriesId,
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

        {/* Home Team Score */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <Input
              type="number"
              min="0"
              max="7"
              value={inlineEdit.form.homeTeamScore}
              onChange={(e) => inlineEdit.updateForm({ homeTeamScore: e.target.value })}
              className="w-16"
              aria-label={`${seriesHomeTeam.name} score`}
            />
          ) : (
            <span>{bet.homeTeamScore ?? 0}</span>
          )}
        </TableCell>

        {/* Away Team Score */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <Input
              type="number"
              min="0"
              max="7"
              value={inlineEdit.form.awayTeamScore}
              onChange={(e) => inlineEdit.updateForm({ awayTeamScore: e.target.value })}
              className="w-16"
              aria-label={`${seriesAwayTeam.name} score`}
            />
          ) : (
            <span>{bet.awayTeamScore ?? 0}</span>
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
        isEvaluated={isSeriesEvaluated}
        entityType="Series"
      />
    </>
  )
}
