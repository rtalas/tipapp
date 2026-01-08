'use client'

import { useState } from 'react'
import { Edit, Trash2, Check, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { updateUserBet, deleteUserBet } from '@/actions/user-bets'
import { validateUserBetEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'

type UserBet = Awaited<ReturnType<typeof import('@/actions/user-bets').getMatchesWithUserBets>>[number]['UserBet'][number]
type Team = { id: number; name: string; shortcut: string }
type LeaguePlayer = { id: number; Player: { id: number; firstName: string | null; lastName: string | null } }

interface UserBetFormData {
  homeScore: string
  awayScore: string
  scorerId: string
  overtime: boolean
  homeAdvanced: string // 'home' | 'away' | 'none'
}

interface UserBetRowProps {
  bet: UserBet
  matchHomeTeam: Team
  matchAwayTeam: Team
  availablePlayers: LeaguePlayer[]
  isMatchEvaluated: boolean
}

export function UserBetRow({
  bet,
  matchHomeTeam,
  matchAwayTeam,
  availablePlayers,
  isMatchEvaluated,
}: UserBetRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const inlineEdit = useInlineEdit<UserBetFormData>()

  const handleStartEdit = () => {
    inlineEdit.startEdit(bet.id, {
      homeScore: bet.homeScore.toString(),
      awayScore: bet.awayScore.toString(),
      scorerId: bet.scorerId?.toString() ?? 'none',
      overtime: bet.overtime,
      homeAdvanced:
        bet.homeAdvanced === null ? 'none' : bet.homeAdvanced ? 'home' : 'away',
    })
  }

  const handleSaveEdit = async () => {
    // Ensure form exists
    if (!inlineEdit.form) return

    // Convert form data to proper types for validation
    const validationData = {
      id: bet.id,
      homeScore: parseInt(inlineEdit.form.homeScore),
      awayScore: parseInt(inlineEdit.form.awayScore),
      scorerId: inlineEdit.form.scorerId !== 'none' ? parseInt(inlineEdit.form.scorerId) : undefined,
      overtime: inlineEdit.form.overtime,
      homeAdvanced:
        inlineEdit.form.homeAdvanced === 'none'
          ? undefined
          : inlineEdit.form.homeAdvanced === 'home',
    }

    const validation = validateUserBetEdit(validationData)
    if (!validation.success) {
      toast.error(getErrorMessage(validation.error, 'Validation failed'))
      return
    }

    inlineEdit.setSaving(true)
    const result = await updateUserBet(validation.data)

    if (result.success) {
      toast.success('Bet updated successfully')
      if (isMatchEvaluated) {
        toast.warning('Match is already evaluated. Re-evaluation required.')
      }
      inlineEdit.finishEdit()
    } else {
      toast.error(getErrorMessage(result.error, 'Failed to update bet'))
      inlineEdit.setSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteUserBet(bet.id)

    if (result.success) {
      toast.success('Bet deleted successfully')
      setDeleteDialogOpen(false)
    } else {
      toast.error(getErrorMessage(result.error, 'Failed to delete bet'))
    }
    setIsDeleting(false)
  }

  const userName = `${bet.LeagueUser.User.firstName} ${bet.LeagueUser.User.lastName}`
  const scorerName = bet.LeaguePlayer
    ? `${bet.LeaguePlayer.Player.firstName} ${bet.LeaguePlayer.Player.lastName}`
    : '-'

  const advancedDisplay =
    bet.homeAdvanced === null
      ? '-'
      : bet.homeAdvanced
      ? matchHomeTeam.shortcut
      : matchAwayTeam.shortcut

  const isEditing = inlineEdit.editingId === bet.id

  return (
    <>
      <TableRow>
        {/* User name */}
        <TableCell>{userName}</TableCell>

        {/* Score */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={inlineEdit.form.homeScore}
                onChange={(e) => inlineEdit.updateForm({ homeScore: e.target.value })}
                className="w-16"
                aria-label="Home team score"
              />
              <span>:</span>
              <Input
                type="number"
                min="0"
                value={inlineEdit.form.awayScore}
                onChange={(e) => inlineEdit.updateForm({ awayScore: e.target.value })}
                className="w-16"
                aria-label="Away team score"
              />
            </div>
          ) : (
            <span>
              {bet.homeScore}:{bet.awayScore}
            </span>
          )}
        </TableCell>

        {/* Scorer */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <Select
              value={inlineEdit.form.scorerId}
              onValueChange={(value) => inlineEdit.updateForm({ scorerId: value })}
            >
              <SelectTrigger className="w-[180px]" aria-label="Select scorer">
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
          ) : (
            <span>{scorerName}</span>
          )}
        </TableCell>

        {/* Overtime */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <Checkbox
              checked={inlineEdit.form.overtime}
              onCheckedChange={(checked) =>
                inlineEdit.updateForm({ overtime: checked === true })
              }
              aria-label="Overtime prediction"
            />
          ) : (
            <span>{bet.overtime ? '✓' : '-'}</span>
          )}
        </TableCell>

        {/* Advanced (playoff) */}
        <TableCell>
          {isEditing && inlineEdit.form ? (
            <RadioGroup
              value={inlineEdit.form.homeAdvanced}
              onValueChange={(value) => inlineEdit.updateForm({ homeAdvanced: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="home" id={`home-${bet.id}`} />
                <Label htmlFor={`home-${bet.id}`} className="text-xs">
                  {matchHomeTeam.shortcut}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="away" id={`away-${bet.id}`} />
                <Label htmlFor={`away-${bet.id}`} className="text-xs">
                  {matchAwayTeam.shortcut}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id={`none-${bet.id}`} />
                <Label htmlFor={`none-${bet.id}`} className="text-xs">
                  None
                </Label>
              </div>
            </RadioGroup>
          ) : (
            <span>{advancedDisplay}</span>
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
              {isMatchEvaluated && (
                <div className="mt-2 flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Match is already evaluated</span>
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
