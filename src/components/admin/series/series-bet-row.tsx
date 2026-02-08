'use client'

import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { updateUserSeriesBet, deleteUserSeriesBet, type UserSeriesBet } from '@/actions/series-bets'
import { evaluateSeriesBets } from '@/actions/evaluate-series'
import { validate } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { BetRowActions } from '@/components/admin/bets/shared/bet-row-actions'
import { BetRowDeleteDialog } from '@/components/admin/bets/shared/bet-row-delete-dialog'
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
  const t = useTranslations('admin.bets')
  const deleteDialog = useDeleteDialog()

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

    const validation = validate.userSeriesBetEdit(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, t('validationFailed')))
      return
    }

    inlineEdit.setSaving(true)
    const result = await updateUserSeriesBet(validation.data)

    if (result.success) {
      toast.success(t('betUpdated'))
      if (isSeriesEvaluated) {
        toast.warning(t('seriesReEvaluation'))
      }
      inlineEdit.finishEdit()
    } else {
      toast.error(getErrorMessage('error' in result ? result.error : undefined, t('betUpdateFailed')))
      inlineEdit.setSaving(false)
    }
  }

  const handleDelete = async () => {
    deleteDialog.startDeleting()
    const result = await deleteUserSeriesBet(bet.id)

    if (result.success) {
      toast.success(t('betDeleted'))
      deleteDialog.finishDeleting()
    } else {
      toast.error(getErrorMessage('error' in result ? result.error : undefined, t('betDeleteFailed')))
      deleteDialog.cancelDeleting()
    }
  }

  const handleEvaluate = async () => {
    try {
      const result = await evaluateSeriesBets({
        seriesId,
        userId: bet.LeagueUser.userId, // Evaluate only this user
      })

      if (result.success && 'results' in result) {
        const userResult = result.results[0]
        toast.success(t('betEvaluated', { points: userResult.totalPoints }))
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('betEvaluateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t('betEvaluateFailed')))
      logger.error('Failed to evaluate series bet', { error, betId: bet.id, seriesId })
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
            onDelete={() => deleteDialog.openDialog(bet)}
            onEvaluate={handleEvaluate}
          />
        </TableCell>
      </TableRow>

      {/* Delete confirmation dialog */}
      <BetRowDeleteDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={handleDelete}
        userName={userName}
        isDeleting={deleteDialog.isDeleting}
        isEvaluated={isSeriesEvaluated}
        entityType="Series"
      />
    </>
  )
}
