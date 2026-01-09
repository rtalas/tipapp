'use client'

import * as React from 'react'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ChevronDown, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { deleteMatch } from '@/actions/matches'
import { evaluateMatchBets } from '@/actions/evaluate-matches'
import { getMatchStatus } from '@/lib/match-utils'
import { getErrorMessage } from '@/lib/error-handler'
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
import { AddMatchDialog } from './add-match-dialog'
import { ResultEntryDialog } from './result-entry-dialog'
import { UserBetRow } from './user-bet-row'
import { CreateBetDialog } from './create-bet-dialog'

type LeagueMatch = Awaited<ReturnType<typeof import('@/actions/user-bets').getMatchesWithUserBets>>[number]
type League = Awaited<ReturnType<typeof import('@/actions/shared-queries').getLeaguesWithTeams>>[number]
type User = Awaited<ReturnType<typeof import('@/actions/users').getUsers>>[number]

interface MatchesContentProps {
  matches: LeagueMatch[]
  leagues: League[]
  users: User[]
  league?: { id: number; name: string }
}

export function MatchesContent({ matches, leagues, users, league }: MatchesContentProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [userFilter, setUserFilter] = React.useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedMatch, setSelectedMatch] = React.useState<LeagueMatch | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [matchToDelete, setMatchToDelete] = React.useState<LeagueMatch | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [createBetMatchId, setCreateBetMatchId] = React.useState<number | null>(null)

  // Expandable rows
  const { isExpanded, toggleRow } = useExpandableRow()

  // Filter matches with optimized string search
  const filteredMatches = matches.filter((lm) => {
    const status = getMatchStatus(lm.Match)

    // Status filter
    if (statusFilter !== 'all' && status !== statusFilter) {
      return false
    }

    // League filter (only if not on league-specific page)
    if (!league && leagueFilter !== 'all' && lm.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // User filter - show only matches where this user has bets
    if (userFilter !== 'all') {
      const userId = parseInt(userFilter, 10)
      const hasUserBet = lm.UserBet.some((bet) => bet.LeagueUser.userId === userId)
      if (!hasUserBet) {
        return false
      }
    }

    // Search filter - optimized: combine team names
    if (search) {
      const searchLower = search.toLowerCase()
      const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name.toLowerCase()
      const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name.toLowerCase()
      const searchableText = `${homeTeam} ${awayTeam}`.toLowerCase()
      return searchableText.includes(searchLower)
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

  const handleEvaluate = async (leagueMatchId: number, matchId: number) => {
    try {
      const result = await evaluateMatchBets({
        leagueMatchId,
        matchId,
      })

      if (result.success) {
        toast.success(
          `Match evaluated! ${result.totalUsersEvaluated} user(s) updated.`
        )
      } else {
        toast.error(getErrorMessage(result.error, 'Failed to evaluate match'))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate match'))
      console.error(error)
    }
  }

  const createBetMatch = filteredMatches.find((m) => m.id === createBetMatchId)

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
              <SelectItem value="live">Live</SelectItem>
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
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    {!league && <TableHead>League</TableHead>}
                    <TableHead>Matchup</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Bets</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.map((lm) => {
                    const status = getMatchStatus(lm.Match)
                    const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
                    const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team
                    const homePlayers = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.LeaguePlayer
                    const awayPlayers = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.LeaguePlayer
                    const allPlayers = [...homePlayers, ...awayPlayers]
                    const expanded = isExpanded(lm.id)

                    return (
                      <Fragment key={lm.id}>
                        {/* Main row - clickable to expand */}
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRow(lm.id)}
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
                            #{lm.Match.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(lm.Match.dateTime), 'd.M.yyyy')}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(lm.Match.dateTime), 'HH:mm')}
                              </span>
                            </div>
                          </TableCell>
                          {!league && (
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
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{homeTeam.name}</span>
                              <span className="text-muted-foreground">vs</span>
                              <span className="font-medium">{awayTeam.name}</span>
                              {league && lm.Match.isPlayoffGame && (
                                <Badge variant="warning" className="text-xs">
                                  Playoff
                                </Badge>
                              )}
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
                          <TableCell className="text-center">
                            <Badge variant="outline">{lm.UserBet.length}</Badge>
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
                                aria-label={`Edit match result: ${homeTeam.name} vs ${awayTeam.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEvaluate(lm.id, lm.Match.id)
                                }}
                                aria-label={`Evaluate match: ${homeTeam.name} vs ${awayTeam.name}`}
                              >
                                <Calculator className="h-4 w-4 text-blue-600" />
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

                        {/* Expanded row - user bets */}
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/20 p-0">
                              <div className="p-4">
                                {lm.UserBet.length === 0 ? (
                                  <div className="py-8 text-center">
                                    <p className="text-muted-foreground">No bets yet for this match</p>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>User</TableHead>
                                          <TableHead>Score</TableHead>
                                          <TableHead>Scorer</TableHead>
                                          <TableHead>OT</TableHead>
                                          <TableHead>Advanced</TableHead>
                                          <TableHead>Points</TableHead>
                                          <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lm.UserBet.map((bet) => (
                                          <UserBetRow
                                            key={bet.id}
                                            bet={bet}
                                            matchHomeTeam={homeTeam}
                                            matchAwayTeam={awayTeam}
                                            availablePlayers={allPlayers}
                                            isMatchEvaluated={lm.Match.isEvaluated}
                                            leagueMatchId={lm.id}
                                            matchId={lm.Match.id}
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
                                    onClick={() => setCreateBetMatchId(lm.id)}
                                    aria-label="Add missing bet for this match"
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

      {/* Add Match Dialog */}
      <AddMatchDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        leagues={leagues}
        league={league}
      />

      {/* Result Entry Dialog */}
      {selectedMatch && (
        <ResultEntryDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}

      {/* Create Bet Dialog */}
      {createBetMatch && (
        <CreateBetDialog
          open={createBetMatchId !== null}
          onOpenChange={(open) => !open && setCreateBetMatchId(null)}
          match={createBetMatch}
          availablePlayers={
            [
              ...createBetMatch.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.LeaguePlayer,
              ...createBetMatch.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.LeaguePlayer,
            ]
          }
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
          {matchToDelete && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Match ID:</span>
                <span className="font-mono">#{matchToDelete.Match.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date:</span>
                <span>{format(new Date(matchToDelete.Match.dateTime), 'd.M.yyyy HH:mm')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Matchup:</span>
                <span className="font-medium">
                  {matchToDelete.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name} vs{' '}
                  {matchToDelete.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">League:</span>
                <span>{matchToDelete.League.name}</span>
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
