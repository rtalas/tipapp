import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BetControls } from './bet-controls'
import { SPORT_IDS } from '@/lib/constants'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('./scorer-select', () => ({
  ScorerSelect: () => <div data-testid="scorer-select" />,
}))

function createMatch(overrides: {
  sportId?: number
  isPlayoffGame?: boolean
  homePlayers?: unknown[]
  awayPlayers?: unknown[]
} = {}): any {
  return {
    id: 1,
    League: { sportId: overrides.sportId ?? SPORT_IDS.HOCKEY },
    Match: {
      isPlayoffGame: overrides.isPlayoffGame ?? false,
      LeagueTeam_Match_homeTeamIdToLeagueTeam: {
        Team: { name: 'Home', shortcut: 'HOM', flagIcon: null, flagType: null },
        LeaguePlayer: overrides.homePlayers ?? [],
      },
      LeagueTeam_Match_awayTeamIdToLeagueTeam: {
        Team: { name: 'Away', shortcut: 'AWY', flagIcon: null, flagType: null },
        LeaguePlayer: overrides.awayPlayers ?? [],
      },
    },
  }
}

function renderControls(overrides: {
  match?: any
  homeScore?: number
  awayScore?: number
  homeAdvanced?: boolean | null
} = {}) {
  return render(
    <BetControls
      match={overrides.match ?? createMatch()}
      homeScore={overrides.homeScore ?? 0}
      awayScore={overrides.awayScore ?? 0}
      overtime={false}
      onOvertimeChange={vi.fn()}
      homeAdvanced={overrides.homeAdvanced ?? null}
      onAdvancedChange={vi.fn()}
      scorerId={null}
      onScorerChange={vi.fn()}
      noScorer={null}
      onNoScorerChange={vi.fn()}
    />
  )
}

describe('BetControls', () => {
  describe('hockey (non-soccer-playoff)', () => {
    it('shows overtime checkbox', () => {
      renderControls()
      expect(screen.getByText('overtimeShootout')).toBeInTheDocument()
    })

    it('does not show advancement radio', () => {
      renderControls()
      expect(screen.queryByText('whoWillAdvance')).not.toBeInTheDocument()
    })
  })

  describe('soccer group stage (football, not playoff)', () => {
    it('does not show overtime checkbox', () => {
      const match = createMatch({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: false })
      renderControls({ match })
      expect(screen.queryByText('overtimeShootout')).not.toBeInTheDocument()
    })

    it('does not show advancement radio', () => {
      const match = createMatch({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: false })
      renderControls({ match })
      expect(screen.queryByText('whoWillAdvance')).not.toBeInTheDocument()
    })
  })

  describe('soccer playoff', () => {
    const match = () =>
      createMatch({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: true })

    it('shows advancement radio when prediction is a draw', () => {
      renderControls({ match: match(), homeScore: 2, awayScore: 2 })
      expect(screen.getByText('whoWillAdvance')).toBeInTheDocument()
    })

    it('shows advancement radio for default 0:0 prediction', () => {
      renderControls({ match: match(), homeScore: 0, awayScore: 0 })
      expect(screen.getByText('whoWillAdvance')).toBeInTheDocument()
    })

    it('hides advancement radio when prediction has clear winner', () => {
      renderControls({ match: match(), homeScore: 3, awayScore: 1 })
      expect(screen.queryByText('whoWillAdvance')).not.toBeInTheDocument()
    })

    it('hides advancement radio when away team would win', () => {
      renderControls({ match: match(), homeScore: 0, awayScore: 1 })
      expect(screen.queryByText('whoWillAdvance')).not.toBeInTheDocument()
    })

    it('never shows overtime checkbox', () => {
      renderControls({ match: match(), homeScore: 1, awayScore: 1 })
      expect(screen.queryByText('overtimeShootout')).not.toBeInTheDocument()
    })
  })
})
