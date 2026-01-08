'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteSeries } from '@/actions/series'
import { getErrorMessage } from '@/lib/error-handler'
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

interface Team {
  id: number
  name: string
  shortcut: string
}

interface LeagueTeam {
  id: number
  Team: Team
}

interface League {
  id: number
  name: string
  LeagueTeam: LeagueTeam[]
}

interface SpecialBetSerie {
  id: number
  name: string
  bestOf: number
}

interface Series {
  id: number
  leagueId: number
  dateTime: Date
  homeTeamScore: number | null
  awayTeamScore: number | null
  isEvaluated: boolean
  League: { name: string }
  SpecialBetSerie: SpecialBetSerie
  LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: LeagueTeam
  LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: LeagueTeam
  _count: {
    UserSpecialBetSerie: number
  }
}

interface SeriesContentProps {
  series: Series[]
  leagues: League[]
  specialBetSeries: SpecialBetSerie[]
}

function getSeriesStatus(series: Series): 'scheduled' | 'finished' | 'evaluated' {
  if (series.isEvaluated) return 'evaluated'
  if (series.homeTeamScore !== null && series.awayTeamScore !== null) return 'finished'
  return 'scheduled'
}

export function SeriesContent({ series, leagues, specialBetSeries }: SeriesContentProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedSeries, setSelectedSeries] = React.useState<Series | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [seriesToDelete, setSeriesToDelete] = React.useState<Series | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Filter series with optimized string search
  const filteredSeries = series.filter((s) => {
    const status = getSeriesStatus(s)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // League filter
    if (leagueFilter !== 'all' && s.leagueId !== parseInt(leagueFilter, 10)) {
      return false
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
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 gap-4">
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
          <Select value={leagueFilter} onValueChange={setLeagueFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="League" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              {leagues.map((league) => (
                <SelectItem key={league.id} value={league.id.toString()}>
                  {league.name}
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
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Matchup</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Bets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeries.map((s) => {
                    const status = getSeriesStatus(s)
                    const homeTeam = s.LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam.Team
                    const awayTeam = s.LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam.Team

                    return (
                      <TableRow
                        key={s.id}
                        className="table-row-hover cursor-pointer"
                        onClick={() => setSelectedSeries(s)}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          #{s.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(s.dateTime), 'MMM d, yyyy')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(s.dateTime), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{s.League.name}</TableCell>
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
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {s._count.UserSpecialBetSerie} bet{s._count.UserSpecialBetSerie !== 1 ? 's' : ''}
                          </span>
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
                              aria-label={`Edit series: ${homeTeam.name} vs ${awayTeam.name}`}
                            >
                              <Edit className="h-4 w-4" />
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
      />

      {/* Result Entry Dialog */}
      {selectedSeries && (
        <ResultEntryDialog
          series={selectedSeries}
          open={!!selectedSeries}
          onOpenChange={(open) => !open && setSelectedSeries(null)}
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
