'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { updateUserQuestionBet, deleteUserQuestionBet, type UserQuestionBet } from '@/actions/question-bets'
import { evaluateQuestionBets } from '@/actions/evaluate-questions'
import { validateUserQuestionBetEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { BetRowActions } from '@/components/admin/bets/shared/bet-row-actions'
import { BetRowDeleteDialog } from '@/components/admin/bets/shared/bet-row-delete-dialog'

interface UserQuestionBetFormData {
  userBet: string // 'true' | 'false'
}

interface QuestionBetRowProps {
  bet: UserQuestionBet
  questionText: string
  isQuestionEvaluated: boolean
  questionId: number
}

export function QuestionBetRow({
  bet,
  questionText,
  isQuestionEvaluated,
  questionId,
}: QuestionBetRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const inlineEdit = useInlineEdit<UserQuestionBetFormData>()

  const handleStartEdit = () => {
    inlineEdit.startEdit(bet.id, {
      userBet: bet.userBet !== null ? bet.userBet.toString() : 'true',
    })
  }

  const handleSaveEdit = async () => {
    // Ensure form exists
    if (!inlineEdit.form) return

    // Convert form data to proper types for validation
    const validationData = {
      id: bet.id,
      userBet: inlineEdit.form.userBet === 'true',
    }

    const validation = validateUserQuestionBetEdit(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    inlineEdit.setSaving(true)
    const result = await updateUserQuestionBet(validation.data)

    if (result.success) {
      toast.success('Bet updated successfully')
      if (isQuestionEvaluated) {
        toast.warning('Question is already evaluated. Re-evaluation required.')
      }
      inlineEdit.finishEdit()
    } else {
      toast.error(getErrorMessage(result.error, 'Failed to update bet'))
      inlineEdit.setSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteUserQuestionBet(bet.id)

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
      const result = await evaluateQuestionBets({
        questionId,
        userId: bet.LeagueUser.userId, // Evaluate only this user
      })

      if (result.success) {
        const userResult = result.results[0]
        toast.success(`Bet evaluated! ${userResult.pointsAwarded} points awarded.`)
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
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`no-${bet.id}`} />
                <Label htmlFor={`no-${bet.id}`} className="cursor-pointer">
                  No
                </Label>
              </div>
            </RadioGroup>
          ) : (
            bet.userBet !== null ? (
              <Badge variant={bet.userBet ? 'default' : 'secondary'}>
                {bet.userBet ? 'Yes' : 'No'}
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
        isEvaluated={isQuestionEvaluated}
        entityType="Question"
      />
    </>
  )
}
