'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, Calculator, Calendar, ChevronDown, ChevronUp, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteMatch } from '@/actions/matches'
import { evaluateMatchBets } from '@/actions/evaluate-matches'
import { getMatchStatus } from '@/lib/match-utils'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { useExpandableRow } from '@/hooks/useExpandableRow'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { DetailedEntityDeleteDialog } from '@/components/admin/common/detailed-entity-delete-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MobileCard, MobileCardField } from '@/components/admin/common/mobile-card'
import { ActionMenu } from '@/components/admin/common/action-menu'
import { TeamFlag } from '@/components/common/team-flag'
import { MatchFilters } from './match-filters'
import { MatchTableRow } from './match-table-row'
import { AddMatchDialog } from './add-match-dialog'
import { EditMatchDialog } from './edit-match-dialog'
import { ResultEntryDialog } from './result-entry-dialog'
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<LeagueMatch | null>(null)
  const [editMatch, setEditMatch] = useState<LeagueMatch | null>(null)
  const deleteDialog = useDeleteDialog<LeagueMatch>()
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
    if (!deleteDialog.itemToDelete) return
    deleteDialog.startDeleting()
    try {
      await deleteMatch(deleteDialog.itemToDelete.Match.id)
      toast.success(t('matchDeleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, t('matchDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete match', { error, matchId: deleteDialog.itemToDelete?.Match.id })
      deleteDialog.cancelDeleting()
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
      <MatchFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        leagueFilter={leagueFilter}
        onLeagueFilterChange={setLeagueFilter}
        userFilter={userFilter}
        onUserFilterChange={setUserFilter}
        leagues={leagues}
        users={users}
        showLeagueFilter={!league}
        onAddMatch={() => setAddDialogOpen(true)}
      />

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
                    <TableHead>{t('matchup')}</TableHead>
                    <TableHead className="text-center">{t('score')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-center">{t('userBets')}</TableHead>
                    <TableHead className="w-[80px]">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatches.map((lm) => (
                    <MatchTableRow
                      key={lm.id}
                      match={lm}
                      isExpanded={isExpanded(lm.id)}
                      onToggleExpand={() => toggleRow(lm.id)}
                      onEditMatch={() => setEditMatch(lm)}
                      onEditResult={() => setSelectedMatch(lm)}
                      onEvaluate={() => handleEvaluate(lm.id, lm.Match.id)}
                      onDelete={() => deleteDialog.openDialog(lm)}
                      onAddMissingBet={() => setCreateBetMatchId(lm.id)}
                      showLeagueColumn={!league}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredMatches.map((lm) => {
                const status = getMatchStatus(lm.Match)
                const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
                const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team
                const expanded = isExpanded(lm.id)

                return (
                  <MobileCard key={lm.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamFlag flagIcon={homeTeam.flagIcon} flagType={homeTeam.flagType} teamName={homeTeam.name} size="xs" />
                        <span className="font-medium text-sm">{homeTeam.shortcut}</span>
                        <span className="text-muted-foreground text-xs">{t('vs')}</span>
                        <TeamFlag flagIcon={awayTeam.flagIcon} flagType={awayTeam.flagType} teamName={awayTeam.name} size="xs" />
                        <span className="font-medium text-sm">{awayTeam.shortcut}</span>
                      </div>
                      <ActionMenu items={[
                        { label: t('editMatch'), icon: <Calendar className="h-4 w-4" />, onClick: () => setEditMatch(lm) },
                        { label: t('enterResult'), icon: <Edit className="h-4 w-4" />, onClick: () => setSelectedMatch(lm) },
                        { label: t('evaluateLabel'), icon: <Calculator className="h-4 w-4" />, onClick: () => handleEvaluate(lm.id, lm.Match.id) },
                        { label: t('addMissingBet'), icon: <UserPlus className="h-4 w-4" />, onClick: () => setCreateBetMatchId(lm.id) },
                        { label: t('deleteTitle'), icon: <Trash2 className="h-4 w-4" />, onClick: () => deleteDialog.openDialog(lm), variant: 'destructive' },
                      ]} />
                    </div>
                    <MobileCardField label={t('dateTime')}>
                      {format(new Date(lm.Match.dateTime), 'd.M.yyyy HH:mm')}
                    </MobileCardField>
                    <div className="flex items-center justify-between">
                      <MobileCardField label={t('score')}>
                        {lm.Match.homeRegularScore !== null ? (
                          <span className="font-mono font-bold">
                            {lm.Match.homeRegularScore}:{lm.Match.awayRegularScore}
                          </span>
                        ) : '-'}
                      </MobileCardField>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status === 'evaluated' ? 'evaluated' : status === 'finished' ? 'finished' : status === 'live' ? 'live' : 'scheduled'}>
                        {status === 'evaluated' ? t('evaluated') : status === 'finished' ? t('finished') : status === 'live' ? t('inProgress') : t('scheduled')}
                      </Badge>
                      <Badge variant="outline">{lm.UserBet.length} {t('userBets').toLowerCase()}</Badge>
                    </div>

                    {/* Expand/Collapse bets */}
                    {lm.UserBet.length > 0 && (
                      <>
                        <button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full justify-center pt-1"
                          onClick={() => toggleRow(lm.id)}
                        >
                          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expanded ? t('hideBets') : t('showBets')}
                        </button>
                        {expanded && (
                          <div className="border-t pt-3 space-y-2">
                            {lm.UserBet.map((bet) => (
                              <div key={bet.id} className="text-sm bg-muted/30 rounded px-2 py-1.5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{bet.LeagueUser.User.firstName} {bet.LeagueUser.User.lastName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono">{bet.homeScore}:{bet.awayScore}</span>
                                    {bet.overtime && <span className="text-xs text-muted-foreground">{t('overtime')}</span>}
                                    {bet.totalPoints !== 0 && (
                                      <Badge variant="outline" className="text-xs">{bet.totalPoints}pts</Badge>
                                    )}
                                  </div>
                                </div>
                                {(bet.LeaguePlayer || bet.noScorer) && (
                                  <div className="text-xs text-muted-foreground">
                                    {t('scorer')}: {bet.noScorer
                                      ? <span className="italic">{t('noScorer')}</span>
                                      : bet.LeaguePlayer
                                        ? `${bet.LeaguePlayer.Player.firstName} ${bet.LeaguePlayer.Player.lastName}`
                                        : '-'}
                                  </div>
                                )}
                                {bet.homeAdvanced !== null && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    {t('advanced')}: <TeamFlag
                                      flagIcon={bet.homeAdvanced ? homeTeam.flagIcon : awayTeam.flagIcon}
                                      flagType={bet.homeAdvanced ? homeTeam.flagType : awayTeam.flagType}
                                      teamName={bet.homeAdvanced ? homeTeam.name : awayTeam.name}
                                      size="xs"
                                    />
                                    <span>{bet.homeAdvanced ? homeTeam.shortcut : awayTeam.shortcut}</span>
                                  </div>
                                )}
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
              <span className="text-sm text-muted-foreground">{t('matchId')}</span>
              <span className="font-mono">#{deleteDialog.itemToDelete.Match.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('date')}</span>
              <span>{format(new Date(deleteDialog.itemToDelete.Match.dateTime), 'd.M.yyyy HH:mm')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('matchup')}:</span>
              <span className="font-medium">
                {deleteDialog.itemToDelete.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team.name} {t('vs')}{' '}
                {deleteDialog.itemToDelete.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('league')}:</span>
              <span>{deleteDialog.itemToDelete.League.name}</span>
            </div>
          </div>
        )}
      </DetailedEntityDeleteDialog>
    </>
  )
}
