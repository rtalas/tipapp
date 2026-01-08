'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, CheckCircle, Plus } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserBetRow } from './user-bet-row'
import { CreateBetDialog } from './create-bet-dialog'

type MatchWithBets = Awaited<ReturnType<typeof import('@/actions/user-bets').getMatchesWithUserBets>>[number]

interface MatchCardProps {
  match: MatchWithBets
}

export function MatchCard({ match }: MatchCardProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const homeTeam = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.Team
  const awayTeam = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.Team
  const homePlayers = match.Match.LeagueTeam_Match_homeTeamIdToLeagueTeam.LeaguePlayer
  const awayPlayers = match.Match.LeagueTeam_Match_awayTeamIdToLeagueTeam.LeaguePlayer
  const allPlayers = [...homePlayers, ...awayPlayers]

  const hasScore = match.Match.homeRegularScore !== null && match.Match.awayRegularScore !== null

  const scoreDisplay = hasScore
    ? `${match.Match.homeRegularScore}:${match.Match.awayRegularScore}`
    : 'TBD'

  const overtimeDisplay = match.Match.isOvertime
    ? ' (OT)'
    : match.Match.isShootout
    ? ' (SO)'
    : ''

  const fullScore = `${scoreDisplay}${overtimeDisplay}`

  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={`match-${match.id}`} className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 text-left">
              {/* Match info */}
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
                <span className="text-sm text-muted-foreground">#{match.Match.id}</span>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(match.Match.dateTime), 'MMM d, yyyy HH:mm')}
                </span>
                <Badge variant="secondary">{match.League.name}</Badge>
                <span className="font-medium">
                  {homeTeam.shortcut} vs {awayTeam.shortcut}
                </span>
              </div>

              {/* Score and status */}
              <div className="flex items-center gap-2">
                {hasScore && <span className="font-medium">{fullScore}</span>}
                {match.isDoubled && <Badge variant="outline">2x</Badge>}
                {match.Match.isEvaluated && (
                  <CheckCircle className="h-4 w-4 text-green-600" aria-label="Evaluated" />
                )}
                <Badge variant="outline">{match.UserBet.length} bets</Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            {/* User bets table */}
            {match.UserBet.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No bets yet for this match</p>
              </div>
            ) : (
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
                  {match.UserBet.map((bet) => (
                    <UserBetRow
                      key={bet.id}
                      bet={bet}
                      matchHomeTeam={homeTeam}
                      matchAwayTeam={awayTeam}
                      availablePlayers={allPlayers}
                      isMatchEvaluated={match.Match.isEvaluated}
                    />
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Add Missing Bet button */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                aria-label="Add missing bet for this match"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Missing Bet
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Create bet dialog */}
      <CreateBetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        match={match}
        availablePlayers={allPlayers}
      />
    </>
  )
}
