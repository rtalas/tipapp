'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteSpecialBet } from '@/actions/special-bets'
import { evaluateSpecialBetBets } from '@/actions/evaluate-special-bets'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { DetailedEntityDeleteDialog } from '@/components/admin/common/detailed-entity-delete-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddSpecialBetDialog } from './add-special-bet-dialog'
import { ResultEntryDialog } from './result-entry-dialog'
import { SpecialBetTableRow } from './special-bet-table-row'
import { CreateSpecialBetUserBetDialog } from './create-special-bet-user-bet-dialog'
import { type SpecialBetWithUserBets } from '@/actions/special-bet-bets'
import { type LeagueWithTeams } from '@/actions/shared-queries'
import { type UserBasic } from '@/actions/users'

type SpecialBet = SpecialBetWithUserBets
type League = LeagueWithTeams
type Evaluator = { id: number; name: string }
type User = UserBasic

interface SpecialBetsContentProps {
  specialBets: SpecialBet[]
  leagues: League[]
  evaluators: Evaluator[]
  users: User[]
  league?: { id: number; name: string }
}

function getResultTypeAndDisplay(specialBet: SpecialBet): { type: string; display: string } {
  if (specialBet.specialBetTeamResultId) {
    return {
      type: 'team',
      display: specialBet.LeagueTeam?.Team.name || 'Unknown',
    }
  }
  if (specialBet.specialBetPlayerResultId) {
    const player = specialBet.LeaguePlayer
    return {
      type: 'player',
      display: player ? `${player.Player.firstName} ${player.Player.lastName}` : 'Unknown',
    }
  }
  if (specialBet.specialBetValue !== null) {
    return {
      type: 'value',
      display: specialBet.specialBetValue.toString(),
    }
  }
  return { type: 'none', display: '-' }
}

export function SpecialBetsContent({ specialBets, leagues, evaluators, users, league }: SpecialBetsContentProps) {
  const t = useTranslations('admin.specialBets')
  const tCommon = useTranslations('admin.common')
  const tSeries = useTranslations('admin.series')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedSpecialBet, setSelectedSpecialBet] = useState<SpecialBet | null>(null)
  const deleteDialog = useDeleteDialog<SpecialBet>()
  const [createBetSpecialBetId, setCreateBetSpecialBetId] = useState<number | null>(null)

  // Expandable rows
  const { isExpanded, toggleRow } = useExpandableRow()

  // Helper to get status
  const getSpecialBetStatus = (specialBet: SpecialBet): 'scheduled' | 'finished' | 'evaluated' => {
    if (specialBet.isEvaluated) return 'evaluated'
    const hasResult = specialBet.specialBetTeamResultId !== null ||
                     specialBet.specialBetPlayerResultId !== null ||
                     specialBet.specialBetValue !== null
    if (hasResult) return 'finished'
    return 'scheduled'
  }

  // Filter special bets
  const filteredSpecialBets = specialBets.filter((sb) => {
    const status = getSpecialBetStatus(sb)
    const resultInfo = getResultTypeAndDisplay(sb)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // League filter (only if not on league-specific page)
    if (!league && leagueFilter !== 'all' && sb.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // User filter - show only special bets where this user has bets
    if (userFilter !== 'all') {
      const userId = parseInt(userFilter, 10)
      const hasUserBet = sb.UserSpecialBetSingle.some((bet) => bet.LeagueUser.userId === userId)
      if (!hasUserBet) {
        return false
      }
    }

    // Type filter
    if (typeFilter !== 'all' && resultInfo.type !== typeFilter) {
      return false
    }

    // Search filter (by special bet name)
    if (search) {
      const searchLower = search.toLowerCase()
      const specialBetName = sb.name.toLowerCase()
      return specialBetName.includes(searchLower)
    }

    return true
  })

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return
    deleteDialog.startDeleting()
    try {
      const result = await deleteSpecialBet(deleteDialog.itemToDelete.id)
      if (!result.success) {
        toast.error('error' in result ? result.error : t('specialBetDeleteFailed'))
        deleteDialog.cancelDeleting()
        return
      }
      toast.success(t('specialBetDeleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, t('specialBetDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete special bet', { error, specialBetId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  const handleEvaluate = async (specialBetId: number) => {
    try {
      const result = await evaluateSpecialBetBets({ specialBetId })

      if (result.success && 'totalUsersEvaluated' in result) {
        toast.success(t('specialBetEvaluated', { count: result.totalUsersEvaluated }))
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('specialBetEvaluateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t('specialBetEvaluateFailed')))
      logger.error('Failed to evaluate special bet', { error, specialBetId })
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4 flex-wrap">
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={tCommon('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tSeries('allStatus')}</SelectItem>
              <SelectItem value="scheduled">{tSeries('scheduled')}</SelectItem>
              <SelectItem value="finished">{tSeries('finished')}</SelectItem>
              <SelectItem value="evaluated">{tSeries('evaluated')}</SelectItem>
            </SelectContent>
          </Select>
          {!league && (
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tSeries('league')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tSeries('allLeagues')}</SelectItem>
                {leagues.map((lg) => (
                  <SelectItem key={lg.id} value={lg.id.toString()}>
                    {lg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={tSeries('allUsers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tSeries('allUsers')}</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              <SelectItem value="team">{t('team')}</SelectItem>
              <SelectItem value="player">{t('player')}</SelectItem>
              <SelectItem value="value">{t('value')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createSpecialBet')}
        </Button>
      </div>

      {/* Special Bets table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('allSpecialBets')}</CardTitle>
          <CardDescription>
            {t('specialBetsFound', { count: filteredSpecialBets.length, plural: filteredSpecialBets.length !== 1 ? 's' : '' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSpecialBets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('noSpecialBetsFound')}</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('createFirstSpecialBet')}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">{tSeries('id')}</TableHead>
                    <TableHead>{tSeries('dateTime')}</TableHead>
                    {!league && <TableHead>{tSeries('league')}</TableHead>}
                    <TableHead>{t('specialBet')}</TableHead>
                    <TableHead>{t('result')}</TableHead>
                    <TableHead>{tSeries('points')}</TableHead>
                    <TableHead className="text-center">{tSeries('bets')}</TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpecialBets.map((sb) => {
                    const sbLeague = leagues.find((l) => l.id === sb.leagueId)

                    return (
                      <SpecialBetTableRow
                        key={sb.id}
                        specialBet={sb}
                        league={sbLeague}
                        isExpanded={isExpanded(sb.id)}
                        onToggleExpand={() => toggleRow(sb.id)}
                        onEdit={() => setSelectedSpecialBet(sb)}
                        onEvaluate={() => handleEvaluate(sb.id)}
                        onDelete={() => deleteDialog.openDialog(sb)}
                        onAddMissingBet={() => setCreateBetSpecialBetId(sb.id)}
                        showLeagueColumn={!league}
                      />
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Special Bet Dialog */}
      <AddSpecialBetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        leagues={leagues}
        evaluators={evaluators}
        league={league}
      />

      {/* Result Entry Dialog */}
      {selectedSpecialBet && (
        <ResultEntryDialog
          specialBet={{
            ...selectedSpecialBet,
            _count: { UserSpecialBetSingle: selectedSpecialBet.UserSpecialBetSingle.length },
            LeagueSpecialBetSingleTeamAdvanced: selectedSpecialBet.LeagueSpecialBetSingleTeamAdvanced || []
          }}
          leagues={leagues}
          open={!!selectedSpecialBet}
          onOpenChange={(open) => !open && setSelectedSpecialBet(null)}
        />
      )}

      {/* Create Bet Dialog */}
      {createBetSpecialBetId && (
        <CreateSpecialBetUserBetDialog
          open={createBetSpecialBetId !== null}
          onOpenChange={(open) => !open && setCreateBetSpecialBetId(null)}
          specialBet={filteredSpecialBets.find((sb) => sb.id === createBetSpecialBetId)!}
          league={leagues.find((l) => l.id === filteredSpecialBets.find((sb) => sb.id === createBetSpecialBetId)?.leagueId)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DetailedEntityDeleteDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        title={t('deleteTitle')}
        description={t('deleteConfirm')}
        onConfirm={handleDelete}
        isDeleting={deleteDialog.isDeleting}
      >
        {deleteDialog.itemToDelete && (() => {
          const deleteResultInfo = getResultTypeAndDisplay(deleteDialog.itemToDelete)
          return (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('betId')}</span>
                <span className="font-mono">#{deleteDialog.itemToDelete.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tSeries('date')}</span>
                <span>{format(new Date(deleteDialog.itemToDelete.dateTime), 'd.M.yyyy HH:mm')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('name')}</span>
                <span className="font-medium">{deleteDialog.itemToDelete.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('typeLabel')}</span>
                <Badge variant="outline" className="text-xs">
                  {deleteResultInfo.type !== 'none' ? t(deleteResultInfo.type) : t('notSet')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('pointsLabel')}</span>
                <span>{deleteDialog.itemToDelete.points} {t('pts')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tSeries('leagueLabel')}</span>
                <span>{deleteDialog.itemToDelete.League.name}</span>
              </div>
            </div>
          )
        })()}
      </DetailedEntityDeleteDialog>
    </>
  )
}
