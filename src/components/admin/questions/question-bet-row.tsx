'use client'

import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { updateUserQuestionBet, deleteUserQuestionBet, type UserQuestionBet } from '@/actions/question-bets'
import { evaluateQuestionBets } from '@/actions/evaluate-questions'
import { validate } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { BetRowActions } from '@/components/admin/bets/shared/bet-row-actions'
import { BetRowDeleteDialog } from '@/components/admin/bets/shared/bet-row-delete-dialog'

interface UserQuestionBetFormData {
  userBet: string // 'true' | 'false' | 'null'
}

interface QuestionBetRowProps {
  bet: UserQuestionBet
  questionText: string
  isQuestionEvaluated: boolean
  questionId: number
}

export function QuestionBetRow({
  bet,
  isQuestionEvaluated,
  questionId,
}: QuestionBetRowProps) {
  const t = useTranslations('admin.bets')
  const deleteDialog = useDeleteDialog()

  const inlineEdit = useInlineEdit<UserQuestionBetFormData>()

  const handleStartEdit = () => {
    inlineEdit.startEdit(bet.id, {
      userBet: bet.userBet !== null ? bet.userBet.toString() : 'null',
    })
  }

  const handleSaveEdit = async () => {
    // Ensure form exists
    if (!inlineEdit.form) return

    // Convert form data to proper types for validation
    const validationData = {
      id: bet.id,
      userBet: inlineEdit.form.userBet === 'null' ? null : inlineEdit.form.userBet === 'true',
    }

    const validation = validate.userQuestionBetEdit(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, t('validationFailed')))
      return
    }

    inlineEdit.setSaving(true)
    const result = await updateUserQuestionBet(validation.data)

    if (result.success) {
      toast.success(t('betUpdated'))
      if (isQuestionEvaluated) {
        toast.warning(t('questionReEvaluation'))
      }
      inlineEdit.finishEdit()
    } else {
      toast.error(getErrorMessage('error' in result ? result.error : undefined, t('betUpdateFailed')))
      inlineEdit.setSaving(false)
    }
  }

  const handleDelete = async () => {
    deleteDialog.startDeleting()
    const result = await deleteUserQuestionBet(bet.id)

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
      const result = await evaluateQuestionBets({
        questionId,
        userId: bet.LeagueUser.userId, // Evaluate only this user
      })

      if (result.success && 'results' in result) {
        const userResult = result.results[0]
        toast.success(t('betEvaluated', { points: userResult.pointsAwarded }))
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('betEvaluateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t('betEvaluateFailed')))
      logger.error('Failed to evaluate question bet', { error, betId: bet.id, questionId })
    }
  }

  const userName = `${bet.LeagueUser.User.firstName} ${bet.LeagueUser.User.lastName}`

  const isEditing = inlineEdit.editingId === bet.id

  return (
    <>
      <TableRow>
        {/* User name */}
        <TableCell>{userName}</TableCell>

        {/* Answer (Yes/No) */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <RadioGroup
              value={inlineEdit.form.userBet}
              onValueChange={(value) => inlineEdit.updateForm({ userBet: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`yes-${bet.id}`} />
                <Label htmlFor={`yes-${bet.id}`} className="cursor-pointer">
                  {t('yes')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`no-${bet.id}`} />
                <Label htmlFor={`no-${bet.id}`} className="cursor-pointer">
                  {t('no')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="null" id={`none-${bet.id}`} />
                <Label htmlFor={`none-${bet.id}`} className="cursor-pointer">
                  {t('notAnswered')}
                </Label>
              </div>
            </RadioGroup>
          ) : (
            bet.userBet !== null ? (
              <Badge variant={bet.userBet ? 'default' : 'secondary'}>
                {bet.userBet ? t('yes') : t('no')}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )
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
        isEvaluated={isQuestionEvaluated}
        entityType="Question"
      />
    </>
  )
}
