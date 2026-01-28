'use client'

import { useState } from 'react'
import { Fragment } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, ChevronDown, Calculator, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteMatch } from '@/actions/matches'
import { evaluateMatchBets } from '@/actions/evaluate-matches'
import { getMatchStatus } from '@/lib/match-utils'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { DetailedEntityDeleteDialog } from '@/components/admin/common/detailed-entity-delete-dialog'
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
import { AddMatchDialog } from './add-match-dialog'
import { EditMatchDialog } from './edit-match-dialog'
import { ResultEntryDialog } from './result-entry-dialog'
import { UserBetRow } from './user-bet-row'
import { CreateBetDialog } from './create-bet-dialog'
import { type MatchWithUserBets } from '@/actions/user-bets'
import { type LeagueWithTeams } from '@/actions/shared-queries'
import { type UserBasic } from '@/actions/users'

type LeagueMatch = MatchWithUserBets
type League = LeagueWithTeams
type User = UserBasic

interface MatchPhase {
  id: number
  name: string
  rank: number
  bestOf: number | null
}

interface MatchesContentProps {
  matches: LeagueMatch[]
  leagues: League[]
  users: User[]
  league?: { id: number; name: string }
  phases: MatchPhase[]
}

export function MatchesContent({ matches, leagues, users, league, phases }: MatchesContentProps) {
  const t = useTranslations('admin.matches')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<LeagueMatch | null>(null)
  const [editMatch, setEditMatch] = useState<LeagueMatch | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [matchToDelete, setMatchToDelete] = useState<LeagueMatch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createBetMatchId, setCreateBetMatchId] = useState<number | null>(null)

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
      toast.success(t('matchDeleted'))
      setDeleteDialogOpen(false)
      setMatchToDelete(null)
    } catch (error) {
      const message = getErrorMessage(error, t('matchDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete match', { error, matchId: matchToDelete?.Match.id })
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

      if (result.success && 'totalUsersEvaluated' in result) {
        toast.success(
          t('matchEvaluated', { count: result.totalUsersEvaluated })
        )
      } else if (!result.success) {
        toast.error(getErrorMessage('error' in result ? result.error : undefined, t('matchEvaluateFailed')))
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to evaluate match'))
      logger.error('Failed to evaluate match', { error, leagueMatchId, matchId })
    }
  }

  const createBetMatch = filteredMatches.find((m) => m.id === createBetMatchId)

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatus')}</SelectItem>
              <SelectItem value="scheduled">{t('scheduled')}</SelectItem>
              <SelectItem value="live">{t('inProgress')}</SelectItem>
              <SelectItem value="finished">{t('finished')}</SelectItem>
              <SelectItem value="evaluated">{t('evaluated')}</SelectItem>
            </SelectContent>
          </Select>
          {!league && (
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('league')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allLeagues')}</SelectItem>
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
              <SelectValue placeholder={t('allUsers')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allUsers')}</SelectItem>
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
          {t('addMatch')}
        </Button>
      </div>

      {/* Matches table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {filteredMatches.length} {t('title').toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('noMatchesFound')}</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('addMatch')}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">{t('id')}</TableHead>
                    <TableHead>{t('dateTime')}</TableHead>
                    {!league && <TableHead>{t('league')}</TableHead>}
                    <TableHead>{t('matchup')}</TableHead>
                    <TableHead className="text-center">{t('score')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-center">{t('userBets')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.map((lm) => {
                    const status = getMatchStatus(lm.Match)
                    const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
                    const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team
                    const teams = `${homeTeam.name} ${t('vs')} ${awayTeam.name}`
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
                              <span className="text-muted-foreground">{t('vs')}</span>
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
                                  setEditMatch(lm)
                                }}
                                aria-label={t('editMatchDetails', { teams })}
                              >
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedMatch(lm)
                                }}
                                aria-label={t('editMatchResult', { teams })}
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
                                aria-label={t('evaluateMatch', { teams })}
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
                                aria-label={t('deleteMatch', { teams })}
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
                                    <p className="text-muted-foreground">{t('noUserBets')}</p>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{t('user')}</TableHead>
                                          <TableHead>{t('score')}</TableHead>
                                          <TableHead>{t('scorer')}</TableHead>
                                          <TableHead>{t('overtime')}</TableHead>
                                          <TableHead>{t('advanced')}</TableHead>
                                          <TableHead>{t('points')}</TableHead>
                                          <TableHead className="text-right">{tCommon('actions')}</TableHead>
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
                                    aria-label={t('addMissingBetAria')}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t('addMissingBet')}
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
        phases={phases}
      />

      {/* Edit Match Dialog */}
      {editMatch && (
        <EditMatchDialog
          match={editMatch}
          open={!!editMatch}
          onOpenChange={(open) => !open && setEditMatch(null)}
          phases={phases}
        />
      )}

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
      <DetailedEntityDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('deleteTitle')}
        description={t('deleteConfirm')}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      >
        {matchToDelete && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('matchId')}</span>
              <span className="font-mono">#{matchToDelete.Match.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('date')}</span>
              <span>{format(new Date(matchToDelete.Match.dateTime), 'd.M.yyyy HH:mm')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('matchup')}:</span>
              <span className="font-medium">
                {matchToDelete.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name} {t('vs')}{' '}
                {matchToDelete.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('league')}:</span>
              <span>{matchToDelete.League.name}</span>
            </div>
          </div>
        )}
      </DetailedEntityDeleteDialog>
    </>
  )
}
