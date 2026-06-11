'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, Calculator, Calendar, ChevronDown, ChevronUp, UserPlus, CheckCircle, Loader2 } from 'lucide-react'
import { ScorerRankingBadge } from '@/components/common/scorer-ranking-badge'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { deleteMatch } from '@/actions/matches'
import { evaluateMatchBets } from '@/actions/evaluate-matches'
import { getMatchStatus } from '@/lib/match-utils'
import { getPlayerDisplayName } from '@/lib/user-display-utils'
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
  const [evaluatingMatchId, setEvaluatingMatchId] = useState<number | null>(null)

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

    // Search filter - optimized: combine team names + placeholder text
    if (search) {
      const searchLower = search.toLowerCase()
      const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam?.Team.name.toLowerCase()
        ?? lm.Match.homePlaceholder?.toLowerCase() ?? ''
      const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam?.Team.name.toLowerCase()
        ?? lm.Match.awayPlaceholder?.toLowerCase() ?? ''
      const searchableText = `${homeTeam} ${awayTeam}`
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
    if (evaluatingMatchId !== null) return
    setEvaluatingMatchId(leagueMatchId)
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
    } finally {
      setEvaluatingMatchId(null)
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
                      isEvaluating={evaluatingMatchId === lm.id}
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
                const homeTeam = lm.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam?.Team ?? null
                const awayTeam = lm.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam?.Team ?? null
                const homeLabel = homeTeam?.shortcut ?? lm.Match.homePlaceholder ?? t('tbd')
                const awayLabel = awayTeam?.shortcut ?? lm.Match.awayPlaceholder ?? t('tbd')
                const isPlaceholder = !homeTeam || !awayTeam
                const expanded = isExpanded(lm.id)
                const actualScorerIds = lm.Match.MatchScorer?.map((ms) => ms.scorerId) ?? []
                const actionItems = [
                  { label: t('editMatch'), icon: <Calendar className="h-4 w-4" />, onClick: () => setEditMatch(lm) },
                  ...(isPlaceholder ? [] : [
                    { label: t('enterResult'), icon: <Edit className="h-4 w-4" />, onClick: () => setSelectedMatch(lm) },
                    { label: evaluatingMatchId === lm.id ? `${t('evaluateLabel')}...` : t('evaluateLabel'), icon: evaluatingMatchId === lm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />, onClick: () => handleEvaluate(lm.id, lm.Match.id) },
                    { label: t('addMissingBet'), icon: <UserPlus className="h-4 w-4" />, onClick: () => setCreateBetMatchId(lm.id) },
                  ]),
                  { label: t('deleteTitle'), icon: <Trash2 className="h-4 w-4" />, onClick: () => deleteDialog.openDialog(lm), variant: 'destructive' as const },
                ]

                return (
                  <MobileCard key={lm.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {homeTeam ? (
                          <>
                            <TeamFlag flagIcon={homeTeam.flagIcon} flagType={homeTeam.flagType} teamName={homeTeam.name} size="xs" />
                            <span className="font-medium text-sm">{homeLabel}</span>
                          </>
                        ) : (
                          <span className="font-medium text-sm italic text-muted-foreground">{homeLabel}</span>
                        )}
                        <span className="text-muted-foreground text-xs">{t('vs')}</span>
                        {awayTeam ? (
                          <>
                            <TeamFlag flagIcon={awayTeam.flagIcon} flagType={awayTeam.flagType} teamName={awayTeam.name} size="xs" />
                            <span className="font-medium text-sm">{awayLabel}</span>
                          </>
                        ) : (
                          <span className="font-medium text-sm italic text-muted-foreground">{awayLabel}</span>
                        )}
                      </div>
                      <ActionMenu items={actionItems} />
                    </div>
                    <MobileCardField label={t('dateTime')}>
                      {format(new Date(lm.Match.dateTime), 'd.M.yyyy HH:mm')}
                    </MobileCardField>
                    <div className="flex items-center justify-between">
                      <MobileCardField label={t('score')}>
                        {lm.Match.homeRegularScore !== null ? (
                          <span className="font-mono font-bold">
                            {lm.Match.homeFinalScore ?? lm.Match.homeRegularScore}:{lm.Match.awayFinalScore ?? lm.Match.awayRegularScore}
                            {lm.Match.isShootout && t('shootout')}
                            {lm.Match.isOvertime && !lm.Match.isShootout && t('overtimeSuffix')}
                          </span>
                        ) : '-'}
                      </MobileCardField>
                    </div>
                    <div className="flex items-center gap-2">
                      {lm.isDoubled && (
                        <Badge variant="default" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 border-0 text-[10px] font-bold">2x</Badge>
                      )}
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
                                    <span className="font-mono">{bet.homeScore}:{bet.awayScore}{bet.overtime && t('overtimeSuffix')}</span>
                                    {lm.Match.isEvaluated && (
                                      <Badge variant="outline" className="text-xs">{bet.totalPoints}pts</Badge>
                                    )}
                                  </div>
                                </div>
                                {(bet.LeaguePlayer || bet.noScorer || bet.ownGoal) && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    {t('scorer')} {bet.noScorer
                                      ? <span className="italic">{t('noScorer')}</span>
                                      : bet.ownGoal
                                        ? <span className="italic">{t('ownGoal')}</span>
                                        : bet.LeaguePlayer
                                          ? getPlayerDisplayName(bet.LeaguePlayer.Player)
                                          : '-'}
                                    {lm.Match.isEvaluated && bet.scorerId !== null && bet.scorerId !== undefined && actualScorerIds.includes(bet.scorerId) && (
                                      <>
                                        <ScorerRankingBadge ranking={bet.LeaguePlayer?.topScorerRanking} />
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                      </>
                                    )}
                                  </div>
                                )}
                                {bet.homeAdvanced !== null && homeTeam && awayTeam && (
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
          leagueTeams={leagues.find((l) => l.id === editMatch.leagueId)?.LeagueTeam ?? []}
        />
      )}

      {/* Result Entry Dialog */}
      {selectedMatch && selectedMatch.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam && selectedMatch.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam && (
        <ResultEntryDialog
          match={{
            ...selectedMatch,
            Match: {
              ...selectedMatch.Match,
              LeagueTeam_Match_homeTeamIdToLeagueTeam: selectedMatch.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam,
              LeagueTeam_Match_awayTeamIdToLeagueTeam: selectedMatch.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam,
            },
          }}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}

      {/* Create Bet Dialog (placeholders excluded — both teams required) */}
      {(() => {
        if (!createBetMatch) return null
        const home = createBetMatch.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam
        const away = createBetMatch.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam
        if (!home || !away) return null
        return (
          <CreateBetDialog
            open={createBetMatchId !== null}
            onOpenChange={(open) => !open && setCreateBetMatchId(null)}
            match={{
              ...createBetMatch,
              Match: {
                ...createBetMatch.Match,
                LeagueTeam_Match_homeTeamIdToLeagueTeam: home,
                LeagueTeam_Match_awayTeamIdToLeagueTeam: away,
              },
            }}
            availablePlayers={[...home.LeaguePlayer, ...away.LeaguePlayer]}
          />
        )
      })()}

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
                {deleteDialog.itemToDelete.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam?.Team.name
                  ?? deleteDialog.itemToDelete.Match.homePlaceholder
                  ?? t('tbd')} {t('vs')}{' '}
                {deleteDialog.itemToDelete.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam?.Team.name
                  ?? deleteDialog.itemToDelete.Match.awayPlaceholder
                  ?? t('tbd')}
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
