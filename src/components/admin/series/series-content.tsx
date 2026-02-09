'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, Calculator, Calendar, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import { deleteSeries, createSeries } from '@/actions/series'
import { evaluateSeriesBets } from '@/actions/evaluate-series'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { Badge } from '@/components/ui/badge'
import { MobileCard, MobileCardField } from '@/components/admin/common/mobile-card'
import { ActionMenu } from '@/components/admin/common/action-menu'
import { TeamFlag } from '@/components/common/team-flag'
import { ContentFilterHeader } from '@/components/admin/common/content-filter-header'
import { DetailedEntityDeleteDialog } from '@/components/admin/common/detailed-entity-delete-dialog'
import { SeriesTableRow } from './series-table-row'
import { CreateSeriesDialog } from './create-series-dialog'
import { EditSeriesDialog } from './edit-series-dialog'
import { ResultEntryDialog } from './result-entry-dialog'
import { CreateSeriesBetDialog } from './create-series-bet-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type SeriesWithUserBets } from '@/actions/series-bets'
import { type UserBasic } from '@/actions/users'

type Series = SeriesWithUserBets
type League = { id: number; name: string; LeagueTeam: { id: number; Team: { id: number; name: string; shortcut: string; flagIcon: string | null; flagType: string | null } }[] }
type SpecialBetSerie = { id: number; name: string; bestOf: number }
type User = UserBasic

interface SeriesContentProps {
  series: Series[]
  leagues: League[]
  specialBetSeries: SpecialBetSerie[]
  users: User[]
  league?: { id: number; name: string }
}

interface CreateFormData {
  leagueId: string
  specialBetSerieId: string
  homeTeamId: string
  awayTeamId: string
  dateTime: string
  homeTeamScore: string
  awayTeamScore: string
}

function getSeriesStatus(series: Series): 'scheduled' | 'finished' | 'evaluated' {
  if (series.isEvaluated) return 'evaluated'
  if (series.homeTeamScore !== null && series.awayTeamScore !== null) return 'finished'
  return 'scheduled'
}

export function SeriesContent({ series, leagues, specialBetSeries, users, league }: SeriesContentProps) {
  const t = useTranslations('admin.series')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [editDetailsSeries, setEditDetailsSeries] = useState<Series | null>(null)
  const [createBetSeriesId, setCreateBetSeriesId] = useState<number | null>(null)

  // Expandable rows
  const { isExpanded, toggleRow } = useExpandableRow()

  // Delete dialog
  const deleteDialog = useDeleteDialog<Series>()

  // Create dialog
  const createDialog = useCreateDialog<CreateFormData>({
    leagueId: league?.id.toString() || '',
    specialBetSerieId: '',
    homeTeamId: '',
    awayTeamId: '',
    dateTime: '',
    homeTeamScore: '',
    awayTeamScore: '',
  })

  // Filter series with optimized string search
  const filteredSeries = series.filter((s) => {
    const status = getSeriesStatus(s)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // League filter (only if not on league-specific page)
    if (!league && leagueFilter !== 'all' && s.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // User filter - show only series where this user has bets
    if (userFilter !== 'all') {
      const userId = parseInt(userFilter, 10)
      const hasUserBet = s.UserSpecialBetSerie.some((bet) => bet.LeagueUser.userId === userId)
      if (!hasUserBet) {
        return false
      }
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const homeTeam = s.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team.name.toLowerCase()
      const awayTeam = s.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team.name.toLowerCase()
      const searchableText = `${homeTeam} ${awayTeam}`.toLowerCase()
      return searchableText.includes(searchLower)
    }

    return true
  })

  const handleCreateSeries = async () => {
    createDialog.startCreating()
    try {
      const result = await createSeries({
        leagueId: parseInt(createDialog.form.leagueId, 10),
        specialBetSerieId: parseInt(createDialog.form.specialBetSerieId, 10),
        homeTeamId: parseInt(createDialog.form.homeTeamId, 10),
        awayTeamId: parseInt(createDialog.form.awayTeamId, 10),
        dateTime: new Date(createDialog.form.dateTime),
      })
      if (!result.success) {
        toast.error('error' in result ? result.error : t('seriesCreateFailed'))
        createDialog.cancelCreating()
        return
      }
      toast.success(t('seriesCreated'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, t('seriesCreateFailed'))
      toast.error(message)
      logger.error('Failed to create series', { error })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      const result = await deleteSeries(deleteDialog.itemToDelete.id)
      if (!result.success) {
        toast.error('error' in result ? result.error : t('seriesDeleteFailed'))
        deleteDialog.cancelDeleting()
        return
      }
      toast.success(t('seriesDeleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, t('seriesDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete series', { error, seriesId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  const handleEvaluate = async (seriesId: number) => {
    try {
      const result = await evaluateSeriesBets({
        seriesId,
      })

      if (result.success && 'totalUsersEvaluated' in result) {
        toast.success(
          t('seriesEvaluated', { count: result.totalUsersEvaluated })
        )
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('seriesEvaluateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, t('seriesEvaluateFailed')))
      logger.error('Failed to evaluate series', { error, seriesId })
    }
  }

  const createBetSeries = filteredSeries.find((s) => s.id === createBetSeriesId)

  // Build filters dynamically
  const filters = [
    {
      name: 'status',
      value: statusFilter,
      onChange: setStatusFilter,
      placeholder: tCommon('status'),
      options: [
        { value: 'all', label: t('allStatus') },
        { value: 'scheduled', label: t('scheduled') },
        { value: 'finished', label: t('finished') },
        { value: 'evaluated', label: t('evaluated') },
      ],
    },
    ...(league
      ? []
      : [
          {
            name: 'league',
            value: leagueFilter,
            onChange: setLeagueFilter,
            placeholder: t('league'),
            options: [
              { value: 'all', label: t('allLeagues') },
              ...leagues.map((lg) => ({
                value: lg.id.toString(),
                label: lg.name,
              })),
            ],
          },
        ]),
    {
      name: 'user',
      value: userFilter,
      onChange: setUserFilter,
      placeholder: t('allUsers'),
      options: [
        { value: 'all', label: t('allUsers') },
        ...users.map((user) => ({
          value: user.id.toString(),
          label: `${user.firstName} ${user.lastName}`,
        })),
      ],
    },
  ]

  return (
    <>
      {/* Header with Create Button and Filters */}
      <ContentFilterHeader
        searchPlaceholder={t('searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        createButtonLabel={t('createSeries')}
        onCreateClick={createDialog.openDialog}
      />

      {/* Series table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('allSeries')}</CardTitle>
          <CardDescription>
            {t('seriesFound', { count: filteredSeries.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSeries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('noSeriesFound')}</p>
              <Button onClick={createDialog.openDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {t('createFirstSeries')}
              </Button>
            </div>
          ) : (
            <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">{t('id')}</TableHead>
                    <TableHead>{t('dateTime')}</TableHead>
                    {!league && <TableHead>{t('league')}</TableHead>}
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('matchup')}</TableHead>
                    <TableHead className="text-center">{t('score')}</TableHead>
                    <TableHead className="text-center">{t('bets')}</TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeries.map((s) => (
                    <SeriesTableRow
                      key={s.id}
                      series={s}
                      isExpanded={isExpanded(s.id)}
                      onToggleExpand={() => toggleRow(s.id)}
                      onEditDetails={() => setEditDetailsSeries(s)}
                      onEdit={() => setSelectedSeries(s)}
                      onEvaluate={() => handleEvaluate(s.id)}
                      onDelete={() => deleteDialog.openDialog(s)}
                      onAddBet={() => setCreateBetSeriesId(s.id)}
                      showLeagueColumn={!league}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredSeries.map((s) => {
                const status = getSeriesStatus(s)
                const homeTeam = s.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team
                const awayTeam = s.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team
                const expanded = isExpanded(s.id)

                return (
                  <MobileCard key={s.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamFlag flagIcon={homeTeam.flagIcon} flagType={homeTeam.flagType} teamName={homeTeam.name} size="xs" />
                        <span className="font-medium text-sm">{homeTeam.shortcut}</span>
                        <span className="text-muted-foreground text-xs">{t('vs')}</span>
                        <TeamFlag flagIcon={awayTeam.flagIcon} flagType={awayTeam.flagType} teamName={awayTeam.name} size="xs" />
                        <span className="font-medium text-sm">{awayTeam.shortcut}</span>
                      </div>
                      <ActionMenu items={[
                        { label: t('editDetails'), icon: <Calendar className="h-4 w-4" />, onClick: () => setEditDetailsSeries(s) },
                        { label: t('editResult'), icon: <Edit className="h-4 w-4" />, onClick: () => setSelectedSeries(s) },
                        { label: t('evaluate'), icon: <Calculator className="h-4 w-4" />, onClick: () => handleEvaluate(s.id) },
                        { label: t('addMissingBet'), icon: <UserPlus className="h-4 w-4" />, onClick: () => setCreateBetSeriesId(s.id) },
                        { label: tCommon('delete'), icon: <Trash2 className="h-4 w-4" />, onClick: () => deleteDialog.openDialog(s), variant: 'destructive' },
                      ]} />
                    </div>
                    <MobileCardField label={t('type')}>
                      {s.SpecialBetSerie.name} ({t('bestOf', { count: s.SpecialBetSerie.bestOf })})
                    </MobileCardField>
                    <MobileCardField label={t('dateTime')}>
                      {format(new Date(s.dateTime), 'd.M.yyyy HH:mm')}
                    </MobileCardField>
                    <MobileCardField label={t('score')}>
                      {s.homeTeamScore !== null ? (
                        <span className="font-mono font-bold">{s.homeTeamScore}:{s.awayTeamScore}</span>
                      ) : '-'}
                    </MobileCardField>
                    <div className="flex items-center gap-2">
                      <Badge variant={status === 'evaluated' ? 'evaluated' : status === 'finished' ? 'finished' : 'scheduled'}>
                        {status === 'evaluated' ? t('evaluated') : status === 'finished' ? t('finished') : t('scheduled')}
                      </Badge>
                      <Badge variant="outline">{s.UserSpecialBetSerie.length} {t('bets').toLowerCase()}</Badge>
                    </div>

                    {s.UserSpecialBetSerie.length > 0 && (
                      <>
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-center pt-1"
                          onClick={() => toggleRow(s.id)}
                        >
                          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expanded ? t('hideBets') : t('showBets')}
                        </button>
                        {expanded && (
                          <div className="border-t pt-3 space-y-2">
                            {s.UserSpecialBetSerie.map((bet) => (
                              <div key={bet.id} className="text-sm flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                                <span className="font-medium">{bet.LeagueUser.User.firstName} {bet.LeagueUser.User.lastName}</span>
                                <div className="flex items-center gap-2">
                                  {bet.homeTeamScore !== null && (
                                    <span className="font-mono">{bet.homeTeamScore}:{bet.awayTeamScore}</span>
                                  )}
                                  {bet.totalPoints !== 0 && (
                                    <Badge variant="outline" className="text-xs">{bet.totalPoints}pts</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </MobileCard>
                )
              })}
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Series Dialog */}
      <CreateSeriesDialog
        open={createDialog.open}
        onOpenChange={createDialog.onOpenChange}
        formData={createDialog.form}
        onFormChange={createDialog.updateForm}
        onCreate={handleCreateSeries}
        isCreating={createDialog.isCreating}
        leagues={leagues}
        specialBetSeries={specialBetSeries}
        league={league}
      />

      {/* Edit Series Details Dialog */}
      {editDetailsSeries && (
        <EditSeriesDialog
          series={editDetailsSeries}
          open={!!editDetailsSeries}
          onOpenChange={(open) => !open && setEditDetailsSeries(null)}
        />
      )}

      {/* Result Entry Dialog */}
      {selectedSeries && (
        <ResultEntryDialog
          series={{
            ...selectedSeries,
            _count: { UserSpecialBetSerie: selectedSeries.UserSpecialBetSerie.length }
          }}
          open={!!selectedSeries}
          onOpenChange={(open) => !open && setSelectedSeries(null)}
        />
      )}

      {/* Create Bet Dialog */}
      {createBetSeries && (
        <CreateSeriesBetDialog
          open={createBetSeriesId !== null}
          onOpenChange={(open) => !open && setCreateBetSeriesId(null)}
          series={createBetSeries}
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
        {deleteDialog.itemToDelete && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('seriesId')}</span>
              <span className="font-mono">#{deleteDialog.itemToDelete.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('date')}</span>
              <span>{format(new Date(deleteDialog.itemToDelete.dateTime), 'd.M.yyyy HH:mm')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('typeLabel')}</span>
              <span>{deleteDialog.itemToDelete.SpecialBetSerie.name} ({t('bestOf', { count: deleteDialog.itemToDelete.SpecialBetSerie.bestOf })})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('matchupLabel')}</span>
              <span className="font-medium">
                {deleteDialog.itemToDelete.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team.name} {t('vs')}{' '}
                {deleteDialog.itemToDelete.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('leagueLabel')}</span>
              <span>{deleteDialog.itemToDelete.League.name}</span>
            </div>
          </div>
        )}
      </DetailedEntityDeleteDialog>
    </>
  )
}
