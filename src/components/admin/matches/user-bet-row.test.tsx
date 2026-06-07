import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableBody } from '@/components/ui/table'
import { UserBetRow } from './user-bet-row'

// next-intl mock returns the key itself, so t('ownGoal') === 'ownGoal'
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/actions/user-bets', () => ({
  updateUserBet: vi.fn(),
  deleteUserBet: vi.fn(),
}))

vi.mock('@/actions/evaluate-matches', () => ({
  evaluateMatchBets: vi.fn(),
}))

const team = {
  id: 1,
  name: 'Kanada',
  shortcut: 'CAN',
  flagIcon: null,
  flagType: null,
}

function renderRow(betOverrides: Record<string, unknown>) {
  const bet = {
    id: 2687,
    homeScore: 3,
    awayScore: 0,
    scorerId: null,
    noScorer: null,
    ownGoal: null,
    overtime: false,
    usedJoker: false,
    homeAdvanced: null,
    totalPoints: 0,
    LeagueUser: { id: 1, userId: 1, User: { id: 1, firstName: 'Jakub', lastName: 'Novák' } },
    LeaguePlayer: null,
    ...betOverrides,
  }

  return render(
    <Table>
      <TableBody>
        <UserBetRow
          bet={bet as never}
          matchHomeTeam={team}
          matchAwayTeam={{ ...team, id: 2, name: 'Bosna', shortcut: 'BIH' }}
          availablePlayers={[]}
          isMatchEvaluated={false}
          actualScorerIds={[]}
          leagueMatchId={1670}
          matchId={1670}
        />
      </TableBody>
    </Table>
  )
}

describe('UserBetRow - scorer display', () => {
  it('shows the own-goal label when bet.ownGoal is true', () => {
    renderRow({ ownGoal: true })
    expect(screen.getByText('ownGoal')).toBeInTheDocument()
  })

  it('shows the no-scorer label when bet.noScorer is true', () => {
    renderRow({ noScorer: true })
    expect(screen.getByText('noScorer')).toBeInTheDocument()
  })

  it('does not show own-goal or no-scorer labels when no prediction was made', () => {
    renderRow({})
    expect(screen.queryByText('ownGoal')).not.toBeInTheDocument()
    expect(screen.queryByText('noScorer')).not.toBeInTheDocument()
  })
})
