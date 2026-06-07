import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MatchCard } from './match-card'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Mock server actions
const mockSaveMatchBet = vi.fn()
const mockGetFriendPredictions = vi.fn()
vi.mock('@/actions/user/matches', () => ({
  saveMatchBet: (...args: unknown[]) => mockSaveMatchBet(...args),
  getMatchFriendPredictions: (...args: unknown[]) => mockGetFriendPredictions(...args),
}))

// Mock child components
vi.mock('./match-header', () => ({
  MatchHeader: ({ isDoubled }: { isDoubled: boolean }) => (
    <div data-testid="match-header">{isDoubled && <span>2x</span>}</div>
  ),
}))

vi.mock('./match-teams-display', () => ({
  MatchTeamsDisplay: ({
    homeScore,
    awayScore,
    onHomeScoreChange,
    onAwayScoreChange,
  }: {
    homeScore: number
    awayScore: number
    onHomeScoreChange: (v: number) => void
    onAwayScoreChange: (v: number) => void
  }) => (
    <div data-testid="match-teams">
      <span data-testid="home-score">{homeScore}</span>
      <span data-testid="away-score">{awayScore}</span>
      <button data-testid="home-inc" onClick={() => onHomeScoreChange(homeScore + 1)}>
        Home+
      </button>
      <button data-testid="away-inc" onClick={() => onAwayScoreChange(awayScore + 1)}>
        Away+
      </button>
    </div>
  ),
}))

vi.mock('./bet-controls', () => ({
  BetControls: () => <div data-testid="bet-controls">BetControls</div>,
}))

vi.mock('./bet-display', () => ({
  BetDisplay: () => <div data-testid="bet-display">BetDisplay</div>,
}))

vi.mock('./save-button', () => ({
  SaveButton: ({
    isSaving,
    isSaved,
    onClick,
  }: {
    isSaving: boolean
    isSaved: boolean
    onClick: () => void
  }) => (
    <button data-testid="save-button" onClick={onClick} disabled={isSaving}>
      {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
    </button>
  ),
}))

vi.mock('./friend-predictions-list', () => ({
  FriendPredictionsList: () => null,
}))

vi.mock('@/components/user/common/friend-predictions-modal', () => ({
  FriendPredictionsModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="friends-modal" /> : null,
}))

function createTeamData(name: string, shortcut: string) {
  return {
    Team: {
      name,
      shortcut,
      flagIcon: null,
      flagType: null,
    },
    group: null,
    LeaguePlayer: [],
  }
}

function createMatch(overrides: Record<string, unknown> = {}): any {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return {
    id: 1,
    isBettingOpen: true,
    isDoubled: false,
    League: { sportId: 1, id: 1, name: 'NHL', Sport: { id: 1, name: 'Hockey' } },
    Match: {
      dateTime: futureDate,
      isEvaluated: false,
      isPlayoffGame: false,
      homeRegularScore: null,
      awayRegularScore: null,
      isOvertime: false,
      isShootout: false,
      MatchPhase: null,
      gameNumber: null,
      MatchScorer: [],
      LeagueTeam_Match_homeTeamIdToLeagueTeam: createTeamData('Panthers', 'FLA'),
      LeagueTeam_Match_awayTeamIdToLeagueTeam: createTeamData('Oilers', 'EDM'),
    },
    userBet: null,
    ...overrides,
  }
}

describe('MatchCard', () => {
  const user = userEvent.setup()
  const mockOnBetSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveMatchBet.mockResolvedValue({ success: true })
  })

  describe('Open state (betting open)', () => {
    it('renders match header', () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)
      expect(screen.getByTestId('match-header')).toBeInTheDocument()
    })

    it('renders match teams display', () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)
      expect(screen.getByTestId('match-teams')).toBeInTheDocument()
    })

    it('renders bet controls when betting is open', () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)
      expect(screen.getByTestId('bet-controls')).toBeInTheDocument()
    })

    it('renders save button when betting is open', () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)
      expect(screen.getByTestId('save-button')).toBeInTheDocument()
    })

    it('does not render bet display when open', () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)
      expect(screen.queryByTestId('bet-display')).not.toBeInTheDocument()
    })

    it('does not show friends picks button when open', () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)
      expect(screen.queryByText('friendsPicks')).not.toBeInTheDocument()
    })
  })

  describe('Placeholder match (missing team)', () => {
    const placeholderMatch = () =>
      createMatch({
        Match: {
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isEvaluated: false,
          isPlayoffGame: true,
          homeRegularScore: null,
          awayRegularScore: null,
          isOvertime: false,
          isShootout: false,
          MatchPhase: null,
          gameNumber: null,
          MatchScorer: [],
          homeTeamId: null,
          awayTeamId: 2,
          homePlaceholder: 'Winner of QF1',
          awayPlaceholder: null,
          LeagueTeam_Match_homeTeamIdToLeagueTeam: null,
          LeagueTeam_Match_awayTeamIdToLeagueTeam: createTeamData('Oilers', 'EDM'),
        },
      })

    it('does not render bet controls for placeholder', () => {
      render(<MatchCard match={placeholderMatch()} jokersRemaining={0} />)
      expect(screen.queryByTestId('bet-controls')).not.toBeInTheDocument()
    })

    it('does not render save button for placeholder', () => {
      render(<MatchCard match={placeholderMatch()} jokersRemaining={0} />)
      expect(screen.queryByTestId('save-button')).not.toBeInTheDocument()
    })

    it('does not render bet display for placeholder', () => {
      render(<MatchCard match={placeholderMatch()} jokersRemaining={0} />)
      expect(screen.queryByTestId('bet-display')).not.toBeInTheDocument()
    })

    it('shows waiting-for-opponents notice', () => {
      render(<MatchCard match={placeholderMatch()} jokersRemaining={0} />)
      expect(screen.getByText('waitingForOpponents')).toBeInTheDocument()
    })
  })

  describe('Score changes', () => {
    it('updates home score when changed', async () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('home-inc'))

      expect(screen.getByTestId('home-score')).toHaveTextContent('1')
    })

    it('updates away score when changed', async () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('away-inc'))

      expect(screen.getByTestId('away-score')).toHaveTextContent('1')
    })

    it('marks as unsaved when score changes', async () => {
      const match = createMatch({
        userBet: {
          homeScore: 2,
          awayScore: 1,
          scorerId: null,
          noScorer: null,
          overtime: false,
          homeAdvanced: null,
          totalPoints: 0,
          LeaguePlayer: null,
        },
      })

      render(<MatchCard match={match} jokersRemaining={0} />)

      expect(screen.getByTestId('save-button')).toHaveTextContent('Saved')

      await user.click(screen.getByTestId('home-inc'))

      expect(screen.getByTestId('save-button')).toHaveTextContent('Save')
    })
  })

  describe('Save flow', () => {
    it('calls saveMatchBet with correct data', async () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} onBetSaved={mockOnBetSaved} />)

      await user.click(screen.getByTestId('home-inc'))
      await user.click(screen.getByTestId('home-inc'))
      await user.click(screen.getByTestId('away-inc'))
      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockSaveMatchBet).toHaveBeenCalledWith({
          leagueMatchId: 1,
          homeScore: 2,
          awayScore: 1,
          scorerId: null,
          noScorer: null,
          ownGoal: null,
          overtime: false,
          homeAdvanced: null,
          useJoker: false,
        })
      })
    })

    it('calls onBetSaved callback on success', async () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} onBetSaved={mockOnBetSaved} />)

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockOnBetSaved).toHaveBeenCalled()
      })
    })

    it('shows saved state after successful save', async () => {
      render(<MatchCard match={createMatch()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toHaveTextContent('Saved')
      })
    })

    it('shows error toast on save failure', async () => {
      const { toast } = await import('sonner')
      mockSaveMatchBet.mockResolvedValue({ success: false, error: 'Match locked' })

      render(<MatchCard match={createMatch()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Match locked')
      })
    })

    it('shows error toast on network error', async () => {
      const { toast } = await import('sonner')
      mockSaveMatchBet.mockRejectedValue(new Error('Network error'))

      render(<MatchCard match={createMatch()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('saveError')
      })
    })

    it('does not save when locked', async () => {
      const match = createMatch({ isBettingOpen: false })

      render(<MatchCard match={match} jokersRemaining={0} />)

      // Save button shouldn't exist when locked
      expect(screen.queryByTestId('save-button')).not.toBeInTheDocument()
    })
  })

  describe('Locked state (betting closed)', () => {
    it('shows bet display when locked', () => {
      const match = createMatch({ isBettingOpen: false })
      render(<MatchCard match={match} jokersRemaining={0} />)
      expect(screen.getByTestId('bet-display')).toBeInTheDocument()
    })

    it('does not show bet controls when locked', () => {
      const match = createMatch({ isBettingOpen: false })
      render(<MatchCard match={match} jokersRemaining={0} />)
      expect(screen.queryByTestId('bet-controls')).not.toBeInTheDocument()
    })

    it('does not show save button when locked', () => {
      const match = createMatch({ isBettingOpen: false })
      render(<MatchCard match={match} jokersRemaining={0} />)
      expect(screen.queryByTestId('save-button')).not.toBeInTheDocument()
    })

    it('shows friends picks button when locked', () => {
      const match = createMatch({ isBettingOpen: false })
      render(<MatchCard match={match} jokersRemaining={0} />)
      expect(screen.getByText('friendsPicks')).toBeInTheDocument()
    })

    it('applies opacity class when locked but not evaluated', () => {
      const match = createMatch({ isBettingOpen: false })
      const { container } = render(<MatchCard match={match} jokersRemaining={0} />)
      const card = container.querySelector('.glass-card')
      expect(card).toHaveClass('opacity-80')
    })
  })

  describe('Evaluated state', () => {
    it('does not apply opacity when evaluated', () => {
      const match = createMatch({
        isBettingOpen: false,
        Match: {
          ...createMatch().Match,
          isEvaluated: true,
          homeRegularScore: 3,
          awayRegularScore: 1,
        },
      })

      const { container } = render(<MatchCard match={match} jokersRemaining={0} />)
      const card = container.querySelector('.glass-card')
      expect(card).not.toHaveClass('opacity-80')
    })
  })

  describe('Pre-existing bet', () => {
    it('initializes scores from existing bet', () => {
      const match = createMatch({
        userBet: {
          homeScore: 3,
          awayScore: 1,
          scorerId: null,
          noScorer: null,
          overtime: false,
          homeAdvanced: null,
          totalPoints: 0,
          LeaguePlayer: null,
        },
      })

      render(<MatchCard match={match} jokersRemaining={0} />)

      expect(screen.getByTestId('home-score')).toHaveTextContent('3')
      expect(screen.getByTestId('away-score')).toHaveTextContent('1')
    })

    it('shows saved state when bet exists', () => {
      const match = createMatch({
        userBet: {
          homeScore: 3,
          awayScore: 1,
          scorerId: null,
          noScorer: null,
          overtime: false,
          homeAdvanced: null,
          totalPoints: 0,
          LeaguePlayer: null,
        },
      })

      render(<MatchCard match={match} jokersRemaining={0} />)

      expect(screen.getByTestId('save-button')).toHaveTextContent('Saved')
    })
  })

  describe('Doubled matches', () => {
    it('passes isDoubled to MatchHeader', () => {
      const match = createMatch({ isDoubled: true })
      render(<MatchCard match={match} jokersRemaining={0} />)
      expect(screen.getByText('2x')).toBeInTheDocument()
    })
  })

  describe('Friends predictions', () => {
    it('opens friends modal when button clicked', async () => {
      mockGetFriendPredictions.mockResolvedValue({ predictions: [] })
      const match = createMatch({ isBettingOpen: false })

      render(<MatchCard match={match} jokersRemaining={0} />)

      await user.click(screen.getByText('friendsPicks'))

      await waitFor(() => {
        expect(screen.getByTestId('friends-modal')).toBeInTheDocument()
      })
    })

    it('loads friend predictions when modal opened', async () => {
      mockGetFriendPredictions.mockResolvedValue({ predictions: [] })
      const match = createMatch({ isBettingOpen: false })

      render(<MatchCard match={match} jokersRemaining={0} />)

      await user.click(screen.getByText('friendsPicks'))

      await waitFor(() => {
        expect(mockGetFriendPredictions).toHaveBeenCalledWith(1)
      })
    })
  })

  describe('Soccer playoff homeAdvanced derivation', () => {
    function soccerPlayoff(overrides: Record<string, unknown> = {}) {
      const base = createMatch()
      return {
        ...base,
        League: { ...base.League, sportId: 2 },
        Match: { ...base.Match, isPlayoffGame: true },
        ...overrides,
      }
    }

    it('saves null homeAdvanced when prediction is a draw (default 0:0) without user selection', async () => {
      render(<MatchCard match={soccerPlayoff()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockSaveMatchBet).toHaveBeenCalledWith(
          expect.objectContaining({ homeScore: 0, awayScore: 0, homeAdvanced: null })
        )
      })
    })

    it('auto-derives homeAdvanced=true when home prediction is winning', async () => {
      render(<MatchCard match={soccerPlayoff()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('home-inc')) // 1:0

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockSaveMatchBet).toHaveBeenCalledWith(
          expect.objectContaining({ homeScore: 1, awayScore: 0, homeAdvanced: true })
        )
      })
    })

    it('auto-derives homeAdvanced=false when away prediction is winning', async () => {
      render(<MatchCard match={soccerPlayoff()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('away-inc')) // 0:1

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockSaveMatchBet).toHaveBeenCalledWith(
          expect.objectContaining({ homeScore: 0, awayScore: 1, homeAdvanced: false })
        )
      })
    })

    it('keeps last derived value when returning to a draw', async () => {
      render(<MatchCard match={soccerPlayoff()} jokersRemaining={0} />)

      await user.click(screen.getByTestId('home-inc')) // 1:0 → auto-derives true
      await user.click(screen.getByTestId('away-inc')) // 1:1 (draw, preserves prior)

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockSaveMatchBet).toHaveBeenCalledWith(
          expect.objectContaining({ homeScore: 1, awayScore: 1, homeAdvanced: true })
        )
      })
    })

    it('does not derive homeAdvanced for hockey playoff', async () => {
      const base = createMatch()
      const hockeyPlayoff = {
        ...base,
        Match: { ...base.Match, isPlayoffGame: true },
      }

      render(<MatchCard match={hockeyPlayoff} jokersRemaining={0} />)

      await user.click(screen.getByTestId('home-inc')) // 1:0

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockSaveMatchBet).toHaveBeenCalledWith(
          expect.objectContaining({ homeScore: 1, awayScore: 0, homeAdvanced: null })
        )
      })
    })

    it('does not derive homeAdvanced for soccer group stage', async () => {
      const base = createMatch()
      const soccerGroup = {
        ...base,
        League: { ...base.League, sportId: 2 },
        Match: { ...base.Match, isPlayoffGame: false },
      }

      render(<MatchCard match={soccerGroup} jokersRemaining={0} />)

      await user.click(screen.getByTestId('home-inc')) // 1:0

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockSaveMatchBet).toHaveBeenCalledWith(
          expect.objectContaining({ homeScore: 1, awayScore: 0, homeAdvanced: null })
        )
      })
    })
  })
})
