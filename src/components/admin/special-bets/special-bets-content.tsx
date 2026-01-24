'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ChevronDown, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteSpecialBet } from '@/actions/special-bets'
import { evaluateSpecialBetBets } from '@/actions/evaluate-special-bets'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AddSpecialBetDialog } from './add-special-bet-dialog'
import { ResultEntryDialog } from './result-entry-dialog'
import { SpecialBetRow } from './special-bet-row'
import { CreateSpecialBetUserBetDialog } from './create-special-bet-user-bet-dialog'
import { type SpecialBetWithUserBets } from '@/actions/special-bet-bets'
import { type LeagueWithTeams } from '@/actions/shared-queries'
import { type UserBasic } from '@/actions/users'

type SpecialBet = SpecialBetWithUserBets
type League = LeagueWithTeams
type SpecialBetType = { id: number; name: string }
type User = UserBasic

interface SpecialBetsContentProps {
  specialBets: SpecialBet[]
  leagues: League[]
  specialBetTypes: SpecialBetType[]
  users: User[]
  league?: { id: number; name: string }
}

function getSpecialBetStatus(specialBet: SpecialBet): 'scheduled' | 'finished' | 'evaluated' {
  if (specialBet.isEvaluated) return 'evaluated'
  const hasResult = specialBet.specialBetTeamResultId !== null ||
                   specialBet.specialBetPlayerResultId !== null ||
                   specialBet.specialBetValue !== null
  if (hasResult) return 'finished'
  return 'scheduled'
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

export function SpecialBetsContent({ specialBets, leagues, specialBetTypes, users, league }: SpecialBetsContentProps) {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [specialBetToDelete, setSpecialBetToDelete] = useState<SpecialBet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createBetSpecialBetId, setCreateBetSpecialBetId] = useState<number | null>(null)

  // Expandable rows
  const { isExpanded, toggleRow } = useExpandableRow()

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

    // Search filter (by special bet type name)
    if (search) {
      const searchLower = search.toLowerCase()
      const specialBetName = sb.SpecialBetSingle.name.toLowerCase()
      return specialBetName.includes(searchLower)
    }

    return true
  })

  const handleDelete = async () => {
    if (!specialBetToDelete) return
    setIsDeleting(true)
    try {
      await deleteSpecialBet(specialBetToDelete.id)
      toast.success(t('specialBetDeleted'))
      setDeleteDialogOpen(false)
      setSpecialBetToDelete(null)
    } catch (error) {
      const message = getErrorMessage(error, t('specialBetDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete special bet', { error, specialBetId: specialBetToDelete?.id })
    } finally {
      setIsDeleting(false)
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
                    const status = getSpecialBetStatus(sb)
                    const resultInfo = getResultTypeAndDisplay(sb)
                    const expanded = isExpanded(sb.id)
                    const league = leagues.find((l) => l.id === sb.leagueId)

                    return (
                      <Fragment key={sb.id}>
                        {/* Main row - clickable to expand */}
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(sb.id)}
                        >
                          <TableCell>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 transition-transform',
                                expanded && 'rotate-180'
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            #{sb.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(sb.dateTime), 'd.M.yyyy')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(sb.dateTime), 'HH:mm')}
                              </span>
                            </div>
                          </TableCell>
                          {!league && <TableCell>{sb.League.name}</TableCell>}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{sb.SpecialBetSingle.name}</span>
                              <Badge variant="outline" className="w-fit text-xs">
                                {sb.SpecialBetSingle.SpecialBetSingleType.name !== 'none' ? sb.SpecialBetSingle.SpecialBetSingleType.name : t('notSet')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {resultInfo.type !== 'none' && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {t(resultInfo.type)}
                                </Badge>
                                <span className="text-sm">{resultInfo.display}</span>
                              </div>
                            )}
                            {resultInfo.type === 'none' && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{sb.points} {t('pts')}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{sb.UserSpecialBetSingle.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                status === 'evaluated'
                                  ? 'evaluated'
                                  : status === 'finished'
                                  ? 'finished'
                                  : 'scheduled'
                              }
                            >
                              {tSeries(status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedSpecialBet(sb)
                                }}
                                aria-label={t('editSpecialBet', { name: sb.SpecialBetSingle.name })}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEvaluate(sb.id)
                                }}
                                aria-label={t('evaluateSpecialBet', { name: sb.SpecialBetSingle.name })}
                              >
                                <Calculator className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSpecialBetToDelete(sb)
                                  setDeleteDialogOpen(true)
                                }}
                                aria-label={t('deleteSpecialBet', { name: sb.SpecialBetSingle.name })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row - user bets */}
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={10} className="bg-muted/20 p-0">
                              <div className="p-4">
                                {sb.UserSpecialBetSingle.length === 0 ? (
                                  <div className="py-8 text-center">
                                    <p className="text-muted-foreground">{t('noUserBets')}</p>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{tSeries('user')}</TableHead>
                                          <TableHead>{t('prediction')}</TableHead>
                                          <TableHead>{tSeries('points')}</TableHead>
                                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {sb.UserSpecialBetSingle.map((bet) => (
                                          <SpecialBetRow
                                            key={bet.id}
                                            bet={bet}
                                            specialBet={sb}
                                            league={league}
                                            isEvaluated={sb.isEvaluated}
                                            specialBetId={sb.id}
                                          />
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}

                                {/* Add Missing Bet button */}
                                <div className="mt-4 flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCreateBetSpecialBetId(sb.id)}
                                    aria-label={tSeries('addMissingBetAria')}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {tSeries('addMissingBet')}
                                  </Button>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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
        specialBetTypes={specialBetTypes}
        league={league}
      />

      {/* Result Entry Dialog */}
      {selectedSpecialBet && (
        <ResultEntryDialog
          specialBet={{
            ...selectedSpecialBet,
            _count: { UserSpecialBetSingle: selectedSpecialBet.UserSpecialBetSingle.length }
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirm')}
            </DialogDescription>
          </DialogHeader>
          {specialBetToDelete && (() => {
            const deleteResultInfo = getResultTypeAndDisplay(specialBetToDelete)
            return (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('betId')}</span>
                  <span className="font-mono">#{specialBetToDelete.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tSeries('date')}</span>
                  <span>{format(new Date(specialBetToDelete.dateTime), 'd.M.yyyy HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('name')}</span>
                  <span className="font-medium">{specialBetToDelete.SpecialBetSingle.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('typeLabel')}</span>
                  <Badge variant="outline" className="text-xs">
                    {deleteResultInfo.type !== 'none' ? t(deleteResultInfo.type) : t('notSet')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('pointsLabel')}</span>
                  <span>{specialBetToDelete.points} {t('pts')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{tSeries('leagueLabel')}</span>
                  <span>{specialBetToDelete.League.name}</span>
                </div>
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? tCommon('deleting') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
