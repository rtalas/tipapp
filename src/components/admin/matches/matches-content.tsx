'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
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
