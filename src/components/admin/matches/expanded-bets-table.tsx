import React from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UserBetRow } from './user-bet-row'
import { type UserBet } from '@/actions/user-bets'

type Team = { id: number; name: string; shortcut: string; flagIcon: string | null; flagType: string | null }
type LeaguePlayer = { id: number; Player: { id: number; firstName: string | null; lastName: string | null } }

interface ExpandedBetsTableProps {
  userBets: UserBet[]
  matchHomeTeam: Team
  matchAwayTeam: Team
  availablePlayers: LeaguePlayer[]
  isMatchEvaluated: boolean
  leagueMatchId: number
  matchId: number
  onAddMissingBet: () => void
}

export function ExpandedBetsTable({
  userBets,
  matchHomeTeam,
  matchAwayTeam,
  availablePlayers,
  isMatchEvaluated,
  leagueMatchId,
  matchId,
  onAddMissingBet,
}: ExpandedBetsTableProps) {
  const t = useTranslations('admin.matches')
  const tCommon = useTranslations('admin.common')

  return (
    <div className="p-4">
      {userBets.length === 0 ? (
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
              {userBets.map((bet) => (
                <UserBetRow
                  key={bet.id}
                  bet={bet}
                  matchHomeTeam={matchHomeTeam}
                  matchAwayTeam={matchAwayTeam}
                  availablePlayers={availablePlayers}
                  isMatchEvaluated={isMatchEvaluated}
                  leagueMatchId={leagueMatchId}
                  matchId={matchId}
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
          onClick={onAddMissingBet}
          aria-label={t('addMissingBetAria')}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('addMissingBet')}
        </Button>
      </div>
    </div>
  )
}
