'use client'

import { useState } from 'react'
import { Edit, Trash2, Check, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
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
import { updateUserSeriesBet, deleteUserSeriesBet } from '@/actions/series-bets'
import { validateUserSeriesBetEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'

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
}

export function SeriesBetRow({
  bet,
  seriesHomeTeam,
  seriesAwayTeam,
  isSeriesEvaluated,
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
              {isSeriesEvaluated && (
                <div className="mt-2 flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Series is already evaluated</span>
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
