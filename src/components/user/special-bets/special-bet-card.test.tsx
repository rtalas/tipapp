import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SpecialBetCard } from './special-bet-card'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  format: (_date: Date, fmt: string) => fmt === 'HH:mm' ? '15:00' : '2026-01-01',
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Mock server actions
const mockSaveSpecialBet = vi.fn()
const mockGetFriendPredictions = vi.fn()
vi.mock('@/actions/user/special-bets', () => ({
  saveSpecialBet: (...args: unknown[]) => mockSaveSpecialBet(...args),
  getSpecialBetFriendPredictions: (...args: unknown[]) => mockGetFriendPredictions(...args),
}))

// Mock child components
vi.mock('@/components/user/common/countdown-badge', () => ({
  CountdownBadge: () => null,
}))

vi.mock('@/components/user/common/status-badge', () => ({
  StatusBadge: () => null,
}))

vi.mock('@/components/user/common/friend-predictions-modal', () => ({
  FriendPredictionsModal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="friends-modal">{children}</div> : null,
}))

vi.mock('@/components/common/team-flag', () => ({
  TeamFlag: () => null,
}))

vi.mock('@/components/common/user-avatar', () => ({
  UserAvatar: () => null,
}))

vi.mock('@/components/user/special-bets/searchable-select', () => ({
  SearchableSelect: ({
    value,
    onChange,
    placeholder,
  }: {
    value: number | null
    onChange: (v: number | null) => void
    placeholder: string
  }) => (
    <div data-testid="searchable-select">
      <button data-testid="select-option-1" onClick={() => onChange(1)}>
        Option 1
      </button>
      <button data-testid="select-option-2" onClick={() => onChange(2)}>
        Option 2
      </button>
      <button data-testid="select-clear" onClick={() => onChange(null)}>
        Clear
      </button>
      <span data-testid="select-value">{value ?? 'none'}</span>
      <span data-testid="select-placeholder">{placeholder}</span>
    </div>
  ),
}))

const defaultTeams = [
  {
    id: 1,
    group: null,
    Team: { id: 1, name: 'Panthers', shortcut: 'FLA', flagIcon: null, flagType: null },
  },
  {
    id: 2,
    group: null,
    Team: { id: 2, name: 'Oilers', shortcut: 'EDM', flagIcon: null, flagType: null },
  },
]

const defaultPlayers = [
  {
    id: 1,
    Player: { id: 1, firstName: 'Aleksander', lastName: 'Barkov', position: 'C' },
    LeagueTeam: { Team: { shortcut: 'FLA' } },
  },
  {
    id: 2,
    Player: { id: 2, firstName: 'Connor', lastName: 'McDavid', position: 'C' },
    LeagueTeam: { Team: { shortcut: 'EDM' } },
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSpecialBet(overrides: Record<string, unknown> = {}): any {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return {
    id: 1,
    name: 'Stanley Cup Winner',
    dateTime: futureDate,
    isEvaluated: false,
    isBettingOpen: true,
    group: null,
    Evaluator: { EvaluatorType: { name: 'exact_team' }, config: null },
    SpecialBetSingle: { SpecialBetSingleType: { id: 2 } },
    LeagueTeam: null,
    LeaguePlayer: null,
    specialBetValue: null,
    userBet: null,
    ...overrides,
  }
}

describe('SpecialBetCard', () => {
  const mockOnSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveSpecialBet.mockResolvedValue({ success: true })
  })

  describe('Team bet type', () => {
    it('renders bet name', () => {
      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('Stanley Cup Winner')).toBeInTheDocument()
    })

    it('renders team searchable select', () => {
      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByTestId('select-placeholder')).toHaveTextContent('selectTeam')
    })

    it('enables save button when team selected', () => {
      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-1'))

      const saveButton = screen.getByText('save').closest('button')
      expect(saveButton).not.toBeDisabled()
    })

    it('disables save button when no selection', () => {
      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      const saveButton = screen.getByText('save').closest('button')
      expect(saveButton).toBeDisabled()
    })

    it('saves team bet correctly', async () => {
      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-1'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockSaveSpecialBet).toHaveBeenCalledWith({
          leagueSpecialBetSingleId: 1,
          teamResultId: 1,
          playerResultId: null,
          value: null,
        })
      })
    })
  })

  describe('Player bet type', () => {
    it('renders player searchable select', () => {
      const bet = createSpecialBet({
        name: 'Conn Smythe Trophy',
        Evaluator: { EvaluatorType: { name: 'exact_player' }, config: null },
        SpecialBetSingle: { SpecialBetSingleType: { id: 1 } },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByTestId('select-placeholder')).toHaveTextContent('selectPlayer')
    })

    it('saves player bet correctly', async () => {
      const bet = createSpecialBet({
        Evaluator: { EvaluatorType: { name: 'exact_player' }, config: null },
        SpecialBetSingle: { SpecialBetSingleType: { id: 1 } },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-2'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockSaveSpecialBet).toHaveBeenCalledWith({
          leagueSpecialBetSingleId: 1,
          teamResultId: null,
          playerResultId: 2,
          value: null,
        })
      })
    })
  })

  describe('Value bet type', () => {
    it('renders number input for value bets', () => {
      const bet = createSpecialBet({
        name: 'Total Goals',
        Evaluator: { EvaluatorType: { name: 'exact_value' }, config: null },
        SpecialBetSingle: { SpecialBetSingleType: { id: 3 } },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('enterValue')).toBeInTheDocument()
    })

    it('saves value bet correctly', async () => {
      const bet = createSpecialBet({
        name: 'Total Goals',
        Evaluator: { EvaluatorType: { name: 'exact_value' }, config: null },
        SpecialBetSingle: { SpecialBetSingleType: { id: 3 } },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      const input = screen.getByPlaceholderText('enterPrediction')
      fireEvent.change(input, { target: { value: '42' } })
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockSaveSpecialBet).toHaveBeenCalledWith({
          leagueSpecialBetSingleId: 1,
          teamResultId: null,
          playerResultId: null,
          value: 42,
        })
      })
    })
  })

  describe('Save flow', () => {
    it('calls onSaved callback on success', async () => {
      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-1'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalled()
      })
    })

    it('shows saved state after successful save', async () => {
      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-1'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(screen.getByText('saved')).toBeInTheDocument()
      })
    })

    it('shows error toast on failure', async () => {
      const { toast } = await import('sonner')
      mockSaveSpecialBet.mockResolvedValue({ success: false, error: 'Bet failed' })

      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-1'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Bet failed')
      })
    })

    it('shows error toast on exception', async () => {
      const { toast } = await import('sonner')
      mockSaveSpecialBet.mockRejectedValue(new Error('Network'))

      render(
        <SpecialBetCard
          specialBet={createSpecialBet()}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-1'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('saveError')
      })
    })
  })

  describe('Locked state', () => {
    it('shows user selection when locked', () => {
      const bet = createSpecialBet({
        isBettingOpen: false,
        userBet: { teamResultId: 1, playerResultId: null, value: null, totalPoints: 0 },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('yourPick')).toBeInTheDocument()
      expect(screen.getByText('Panthers')).toBeInTheDocument()
    })

    it('shows "noSelection" when no bet was placed', () => {
      const bet = createSpecialBet({ isBettingOpen: false })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('noSelection')).toBeInTheDocument()
    })

    it('does not show save button when locked', () => {
      const bet = createSpecialBet({ isBettingOpen: false })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.queryByText('save')).not.toBeInTheDocument()
    })

    it('shows friends picks button when locked', () => {
      const bet = createSpecialBet({ isBettingOpen: false })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('friendsPicks')).toBeInTheDocument()
    })
  })

  describe('Evaluated state', () => {
    it('shows actual result when evaluated', () => {
      const bet = createSpecialBet({
        isBettingOpen: false,
        isEvaluated: true,
        LeagueTeam: { Team: { name: 'Oilers', flagIcon: null, flagType: null } },
        userBet: { teamResultId: 1, playerResultId: null, value: null, totalPoints: 0 },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('winner')).toBeInTheDocument()
      expect(screen.getByText('Oilers')).toBeInTheDocument()
    })

    it('shows points badge when evaluated with points', () => {
      const bet = createSpecialBet({
        isBettingOpen: false,
        isEvaluated: true,
        LeagueTeam: { Team: { name: 'Panthers', flagIcon: null, flagType: null } },
        userBet: { teamResultId: 1, playerResultId: null, value: null, totalPoints: 10 },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('+10')).toBeInTheDocument()
    })
  })

  describe('Group filtering', () => {
    it('shows group label when group is set', () => {
      const bet = createSpecialBet({ group: 'A' })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('A')).toBeInTheDocument()
    })
  })

  describe('Pre-existing bet', () => {
    it('shows saved state when bet exists', () => {
      const bet = createSpecialBet({
        userBet: { teamResultId: 1, playerResultId: null, value: null, totalPoints: 0 },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      expect(screen.getByText('saved')).toBeInTheDocument()
    })

    it('marks as unsaved when selection changes', () => {
      const bet = createSpecialBet({
        userBet: { teamResultId: 1, playerResultId: null, value: null, totalPoints: 0 },
      })

      render(
        <SpecialBetCard
          specialBet={bet}
          teams={defaultTeams}
          players={defaultPlayers}
          onSaved={mockOnSaved}
        />
      )

      fireEvent.click(screen.getByTestId('select-option-2'))

      expect(screen.getByText('save')).toBeInTheDocument()
    })
  })
})
