'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteMatch } from '@/actions/matches'
import { getMatchStatus } from '@/lib/match-utils'
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
import { AddMatchDialog } from './add-match-dialog'
import { ResultEntrySheet } from './result-entry-sheet'

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

interface Match {
  id: number
  dateTime: Date
  isEvaluated: boolean
  isPlayoffGame: boolean
  homeRegularScore: number | null
  awayRegularScore: number | null
  homeFinalScore: number | null
  awayFinalScore: number | null
  isOvertime: boolean | null
  isShootout: boolean | null
  LeagueTeam_Match_homeTeamIdToLeagueTeam: LeagueTeam
  LeagueTeam_Match_awayTeamIdToLeagueTeam: LeagueTeam
}

interface LeagueMatch {
  id: number
  leagueId: number
  isDoubled: boolean | null
  League: { name: string }
  Match: Match
}

interface MatchesContentProps {
  matches: LeagueMatch[]
  leagues: League[]
}

export function MatchesContent({ matches, leagues }: MatchesContentProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedMatch, setSelectedMatch] = React.useState<LeagueMatch | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [matchToDelete, setMatchToDelete] = React.useState<LeagueMatch | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Filter matches
  const filteredMatches = matches.filter((lm) => {
    const status = getMatchStatus(lm.Match)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // League filter
    if (leagueFilter !== 'all' && lm.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name.toLowerCase()
      const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name.toLowerCase()
      if (!homeTeam.includes(searchLower) && !awayTeam.includes(searchLower)) {
        return false
      }
    }

    return true
  })

  const handleDelete = async () => {
    if (!matchToDelete) return
    setIsDeleting(true)
    try {
      await deleteMatch(matchToDelete.Match.id)
      toast.success('Match deleted successfully')
      setDeleteDialogOpen(false)
      setMatchToDelete(null)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete match')
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
              <SelectItem value="live">Live</SelectItem>
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
          Create Match
        </Button>
      </div>

      {/* Matches table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>All Matches</CardTitle>
          <CardDescription>
            {filteredMatches.length} matches found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No matches found</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first match
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
                    <TableHead>Matchup</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.map((lm) => {
                    const status = getMatchStatus(lm.Match)
                    const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
                    const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team

                    return (
                      <TableRow
                        key={lm.id}
                        className="table-row-hover cursor-pointer"
                        onClick={() => setSelectedMatch(lm)}
                      >
                        <TableCell className="font-mono text-muted-foreground">
                          #{lm.Match.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(lm.Match.dateTime), 'MMM d, yyyy')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(lm.Match.dateTime), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {lm.League.name}
                            {lm.Match.isPlayoffGame && (
                              <Badge variant="warning" className="text-xs">
                                Playoff
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{homeTeam.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="font-medium">{awayTeam.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {lm.Match.homeRegularScore !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-mono font-bold text-lg">
                                {lm.Match.homeRegularScore}
                              </span>
                              <span className="text-muted-foreground">:</span>
                              <span className="font-mono font-bold text-lg">
                                {lm.Match.awayRegularScore}
                              </span>
                              {(lm.Match.isOvertime || lm.Match.isShootout) && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {lm.Match.isShootout ? '(SO)' : '(OT)'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              status === 'evaluated'
                                ? 'evaluated'
                                : status === 'finished'
                                ? 'finished'
                                : status === 'live'
                                ? 'live'
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
                                setSelectedMatch(lm)
                              }}
                              aria-label={`Edit match: ${homeTeam.name} vs ${awayTeam.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setMatchToDelete(lm)
                                setDeleteDialogOpen(true)
                              }}
                              aria-label={`Delete match: ${homeTeam.name} vs ${awayTeam.name}`}
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

      {/* Add Match Dialog */}
      <AddMatchDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        leagues={leagues}
      />

      {/* Result Entry Sheet */}
      {selectedMatch && (
        <ResultEntrySheet
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Match</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this match? This action cannot be undone.
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
