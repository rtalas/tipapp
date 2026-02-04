'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { TableCell, TableRow } from '@/components/ui/table'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { updateUserBet, deleteUserBet, type UserBet } from '@/actions/user-bets'
import { evaluateMatchBets } from '@/actions/evaluate-matches'
import { validateUserBetEdit } from '@/lib/validation-client'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { BetRowActions } from '@/components/admin/bets/shared/bet-row-actions'
import { BetRowDeleteDialog } from '@/components/admin/bets/shared/bet-row-delete-dialog'
import { TeamFlag } from '@/components/common/team-flag'
type Team = { id: number; name: string; shortcut: string; flagIcon: string | null; flagType: string | null }
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
  leagueMatchId: number
  matchId: number
}

export function UserBetRow({
  bet,
  matchHomeTeam,
  matchAwayTeam,
  availablePlayers,
  isMatchEvaluated,
  leagueMatchId,
  matchId,
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
      toast.error(getErrorMessage('error' in result ? result.error : undefined, 'Failed to update bet'))
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
      toast.error(getErrorMessage('error' in result ? result.error : undefined, 'Failed to delete bet'))
    }
    setIsDeleting(false)
  }

  const handleEvaluate = async () => {
    try {
      const result = await evaluateMatchBets({
        leagueMatchId,
        matchId,
        userId: bet.LeagueUser.userId, // Evaluate only this user
      })

      if (result.success && 'results' in result) {
        const userResult = result.results[0]
        toast.success(`Bet evaluated! ${userResult.totalPoints} points awarded.`)
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, 'Failed to evaluate bet'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate bet'))
      logger.error('Failed to evaluate match bet', { error, betId: bet.id, leagueMatchId, matchId })
    }
  }

  const userName = `${bet.LeagueUser.User.firstName} ${bet.LeagueUser.User.lastName}`
  const scorerDisplay = bet.noScorer
    ? 'No Scorer'
    : bet.LeaguePlayer
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
            <span className={bet.noScorer ? 'italic text-muted-foreground' : ''}>
              {scorerDisplay}
            </span>
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
                <Label htmlFor={`home-${bet.id}`} className="text-xs flex items-center gap-1">
                  <TeamFlag
                    flagIcon={matchHomeTeam.flagIcon}
                    flagType={matchHomeTeam.flagType}
                    teamName={matchHomeTeam.name}
                    size="xs"
                  />
                  {matchHomeTeam.shortcut}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="away" id={`away-${bet.id}`} />
                <Label htmlFor={`away-${bet.id}`} className="text-xs flex items-center gap-1">
                  <TeamFlag
                    flagIcon={matchAwayTeam.flagIcon}
                    flagType={matchAwayTeam.flagType}
                    teamName={matchAwayTeam.name}
                    size="xs"
                  />
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
          ) : bet.homeAdvanced !== null ? (
            <div className="flex items-center gap-1">
              <TeamFlag
                flagIcon={bet.homeAdvanced ? matchHomeTeam.flagIcon : matchAwayTeam.flagIcon}
                flagType={bet.homeAdvanced ? matchHomeTeam.flagType : matchAwayTeam.flagType}
                teamName={bet.homeAdvanced ? matchHomeTeam.name : matchAwayTeam.name}
                size="xs"
              />
              <span>{advancedDisplay}</span>
            </div>
          ) : (
            <span>-</span>
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
        isEvaluated={isMatchEvaluated}
        entityType="Match"
      />
    </>
  )
}
