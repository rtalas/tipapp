'use client'

import * as React from 'react'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ChevronDown, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { deleteSeries } from '@/actions/series'
import { evaluateSeriesBets } from '@/actions/evaluate-series'
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
import { AddSeriesDialog } from './add-series-dialog'
import { ResultEntryDialog } from './result-entry-dialog'
import { SeriesBetRow } from './series-bet-row'
import { CreateSeriesBetDialog } from './create-series-bet-dialog'
import { type SeriesWithUserBets } from '@/actions/series-bets'
import { type UserBasic } from '@/actions/users'

type Series = SeriesWithUserBets
type League = { id: number; name: string; LeagueTeam: { id: number; Team: { id: number; name: string; shortcut: string } }[] }
type SpecialBetSerie = { id: number; name: string; bestOf: number }
type User = UserBasic

interface SeriesContentProps {
  series: Series[]
  leagues: League[]
  specialBetSeries: SpecialBetSerie[]
  users: User[]
  league?: { id: number; name: string }
}

function getSeriesStatus(series: Series): 'scheduled' | 'finished' | 'evaluated' {
  if (series.isEvaluated) return 'evaluated'
  if (series.homeTeamScore !== null && series.awayTeamScore !== null) return 'finished'
  return 'scheduled'
}

export function SeriesContent({ series, leagues, specialBetSeries, users, league }: SeriesContentProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [userFilter, setUserFilter] = React.useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedSeries, setSelectedSeries] = React.useState<Series | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [seriesToDelete, setSeriesToDelete] = React.useState<Series | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [createBetSeriesId, setCreateBetSeriesId] = React.useState<number | null>(null)

  // Expandable rows
  const { isExpanded, toggleRow } = useExpandableRow()

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

  const handleDelete = async () => {
    if (!seriesToDelete) return
    setIsDeleting(true)
    try {
      await deleteSeries(seriesToDelete.id)
      toast.success('Series deleted successfully')
      setDeleteDialogOpen(false)
      setSeriesToDelete(null)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete series')
      toast.error(message)
      logger.error('Failed to delete series', { error, seriesId: seriesToDelete?.id })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEvaluate = async (seriesId: number) => {
    try {
      const result = await evaluateSeriesBets({
        seriesId,
      })

      if (result.success && 'totalUsersEvaluated' in result) {
        toast.success(
          `Series evaluated! ${result.totalUsersEvaluated} user(s) updated.`
        )
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, 'Failed to evaluate series'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate series'))
      logger.error('Failed to evaluate series', { error, seriesId })
    }
  }

  const createBetSeries = filteredSeries.find((s) => s.id === createBetSeriesId)

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input
            placeholder="Search by team name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
              <SelectItem value="evaluated">Evaluated</SelectItem>
            </SelectContent>
          </Select>
          {!league && (
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
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
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Series
        </Button>
      </div>

      {/* Series table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>All Series</CardTitle>
          <CardDescription>
            {filteredSeries.length} series found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSeries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No series found</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first series
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    {!league && <TableHead>League</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Matchup</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Bets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeries.map((s) => {
                    const status = getSeriesStatus(s)
                    const homeTeam = s.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team
                    const awayTeam = s.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team
                    const expanded = isExpanded(s.id)

                    return (
                      <Fragment key={s.id}>
                        {/* Main row - clickable to expand */}
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(s.id)}
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
                            #{s.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(s.dateTime), 'd.M.yyyy')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(s.dateTime), 'HH:mm')}
                              </span>
                            </div>
                          </TableCell>
                          {!league && <TableCell>{s.League.name}</TableCell>}
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {s.SpecialBetSerie.name} (Best of {s.SpecialBetSerie.bestOf})
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{homeTeam.name}</span>
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-medium">{awayTeam.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {s.homeTeamScore !== null ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="font-mono font-bold text-lg">
                                  {s.homeTeamScore}
                                </span>
                                <span className="text-muted-foreground">:</span>
                                <span className="font-mono font-bold text-lg">
                                  {s.awayTeamScore}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{s.UserSpecialBetSerie.length}</Badge>
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
                              {status.charAt(0).toUpperCase() + status.slice(1)}
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
                                  setSelectedSeries(s)
                                }}
                                aria-label={`Edit series result: ${homeTeam.name} vs ${awayTeam.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEvaluate(s.id)
                                }}
                                aria-label={`Evaluate series: ${homeTeam.name} vs ${awayTeam.name}`}
                              >
                                <Calculator className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSeriesToDelete(s)
                                  setDeleteDialogOpen(true)
                                }}
                                aria-label={`Delete series: ${homeTeam.name} vs ${awayTeam.name}`}
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
                                {s.UserSpecialBetSerie.length === 0 ? (
                                  <div className="py-8 text-center">
                                    <p className="text-muted-foreground">No bets yet for this series</p>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>User</TableHead>
                                          <TableHead>Home Score</TableHead>
                                          <TableHead>Away Score</TableHead>
                                          <TableHead>Points</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {s.UserSpecialBetSerie.map((bet) => (
                                          <SeriesBetRow
                                            key={bet.id}
                                            bet={bet}
                                            seriesHomeTeam={homeTeam}
                                            seriesAwayTeam={awayTeam}
                                            isSeriesEvaluated={s.isEvaluated}
                                            seriesId={s.id}
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
                                    onClick={() => setCreateBetSeriesId(s.id)}
                                    aria-label="Add missing bet for this series"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Missing Bet
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

      {/* Add Series Dialog */}
      <AddSeriesDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        leagues={leagues}
        specialBetSeries={specialBetSeries}
        league={league}
      />

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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Series</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this series? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {seriesToDelete && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Series ID:</span>
                <span className="font-mono">#{seriesToDelete.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span>{format(new Date(seriesToDelete.dateTime), 'd.M.yyyy HH:mm')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <span>{seriesToDelete.SpecialBetSerie.name} (Best of {seriesToDelete.SpecialBetSerie.bestOf})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Matchup:</span>
                <span className="font-medium">
                  {seriesToDelete.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team.name} vs{' '}
                  {seriesToDelete.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">League:</span>
                <span>{seriesToDelete.League.name}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
