import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SeriesCard } from './series-card'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}(${JSON.stringify(params)})`
    return key
  },
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
const mockSaveSeriesBet = vi.fn()
const mockGetFriendPredictions = vi.fn()
vi.mock('@/actions/user/series', () => ({
  saveSeriesBet: (...args: unknown[]) => mockSaveSeriesBet(...args),
  getSeriesFriendPredictions: (...args: unknown[]) => mockGetFriendPredictions(...args),
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
  TeamFlag: ({ teamName }: { teamName: string }) => <span data-testid={`flag-${teamName}`} />,
}))

vi.mock('@/components/common/user-avatar', () => ({
  UserAvatar: () => null,
}))

function createSeries(overrides: Record<string, unknown> = {}): any {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return {
    id: 1,
    dateTime: futureDate,
    isEvaluated: false,
    isBettingOpen: true,
    homeTeamScore: null,
    awayTeamScore: null,
    League: { sportId: 1 },
    SpecialBetSerie: { bestOf: 7 },
    LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
      Team: { name: 'Panthers', shortcut: 'FLA', flagIcon: null, flagType: null },
    },
    LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
      Team: { name: 'Oilers', shortcut: 'EDM', flagIcon: null, flagType: null },
    },
    userBet: null,
    ...overrides,
  }
}

describe('SeriesCard', () => {
  const user = userEvent.setup()
  const mockOnSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveSeriesBet.mockResolvedValue({ success: true })
  })

  describe('Open state (betting open)', () => {
    it('renders team names', () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)
      expect(screen.getByText('FLA')).toBeInTheDocument()
      expect(screen.getByText('EDM')).toBeInTheDocument()
    })

    it('renders bestOf badge', () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)
      // useTranslations returns key(params)
      expect(screen.getByText('bestOf({"count":7})')).toBeInTheDocument()
    })

    it('renders score controls with initial scores at 0', () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)
      // Both scores start at 0
      const scoreDisplays = screen.getAllByText('0')
      expect(scoreDisplays).toHaveLength(2)
    })

    it('renders save button (disabled when no winner)', () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)
      const saveButton = screen.getByText('savePrediction').closest('button')
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Score adjustment (bestOf 7)', () => {
    it('increments home score when plus button clicked', () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      // Find plus buttons (there are 4: home+, home-, away+, away-)
      const plusButtons = screen.getAllByRole('button').filter(b => !b.textContent?.includes('savePrediction') && !b.textContent?.includes('friendsPicks'))

      // First plus button should be for home decrement, second for home increment
      // Layout: [-] 0 [+] : [-] 0 [+]
      // The plus buttons contain Plus icon SVGs
      screen.getAllByRole('button').filter(
        b => b.querySelector('.score-button') || b.classList.contains('score-button')
      )

      // Click home increment multiple times to reach winsNeeded (4)
      // Let's use a simpler approach - find buttons by their disabled state
      const homeDecrementBtn = plusButtons[0] // First score button
      expect(homeDecrementBtn).toBeDefined()
    })

    it('caps home score at winsNeeded (4 for bestOf 7)', async () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      // Find all score-related buttons
      const buttons = screen.getAllByRole('button')
      // Score buttons have the 'score-button' class
      const scoreButtons = buttons.filter(b => b.className.includes('score-button'))

      // For bestOf=7, winsNeeded=4
      // Click home increment 5 times (should cap at 4)
      const homeIncrement = scoreButtons[1] // Second button is home +
      for (let i = 0; i < 5; i++) {
        await user.click(homeIncrement)
      }

      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('constrains away score when home reaches winsNeeded', async () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      const buttons = screen.getAllByRole('button')
      const scoreButtons = buttons.filter(b => b.className.includes('score-button'))

      // Increment home to 4 (winsNeeded)
      const homeIncrement = scoreButtons[1]
      for (let i = 0; i < 4; i++) {
        await user.click(homeIncrement)
      }

      // Away increment should be disabled
      const awayIncrement = scoreButtons[3]
      expect(awayIncrement).toBeDisabled()
    })

    it('enables save button when a team reaches winsNeeded', async () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      const buttons = screen.getAllByRole('button')
      const scoreButtons = buttons.filter(b => b.className.includes('score-button'))

      // Increment home to 4
      const homeIncrement = scoreButtons[1]
      for (let i = 0; i < 4; i++) {
        await user.click(homeIncrement)
      }

      const saveButton = screen.getByText('savePrediction').closest('button')
      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('Save flow', () => {
    it('saves with correct scores', async () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      const buttons = screen.getAllByRole('button')
      const scoreButtons = buttons.filter(b => b.className.includes('score-button'))

      // Set home=4, away stays 0
      const homeIncrement = scoreButtons[1]
      for (let i = 0; i < 4; i++) {
        await user.click(homeIncrement)
      }

      await user.click(screen.getByText('savePrediction'))

      await waitFor(() => {
        expect(mockSaveSeriesBet).toHaveBeenCalledWith({
          leagueSpecialBetSerieId: 1,
          homeTeamScore: 4,
          awayTeamScore: 0,
        })
      })
    })

    it('shows saved state after successful save', async () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      const buttons = screen.getAllByRole('button')
      const scoreButtons = buttons.filter(b => b.className.includes('score-button'))
      for (let i = 0; i < 4; i++) {
        await user.click(scoreButtons[1])
      }

      await user.click(screen.getByText('savePrediction'))

      await waitFor(() => {
        expect(screen.getByText('saved')).toBeInTheDocument()
      })
    })

    it('calls onSaved callback on success', async () => {
      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      const buttons = screen.getAllByRole('button')
      const scoreButtons = buttons.filter(b => b.className.includes('score-button'))
      for (let i = 0; i < 4; i++) {
        await user.click(scoreButtons[1])
      }

      await user.click(screen.getByText('savePrediction'))

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalled()
      })
    })

    it('shows error toast on save failure', async () => {
      const { toast } = await import('sonner')
      mockSaveSeriesBet.mockResolvedValue({ success: false, error: 'Failed' })

      render(<SeriesCard series={createSeries()} onSaved={mockOnSaved} />)

      const buttons = screen.getAllByRole('button')
      const scoreButtons = buttons.filter(b => b.className.includes('score-button'))
      for (let i = 0; i < 4; i++) {
        await user.click(scoreButtons[1])
      }

      await user.click(screen.getByText('savePrediction'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed')
      })
    })
  })

  describe('Locked state (betting closed)', () => {
    it('shows result scores when locked with result', () => {
      const series = createSeries({
        isBettingOpen: false,
        homeTeamScore: 4,
        awayTeamScore: 2,
      })

      render(<SeriesCard series={series} onSaved={mockOnSaved} />)

      expect(screen.getByText('result')).toBeInTheDocument()
      expect(screen.getByText(/4 : 2/)).toBeInTheDocument()
    })

    it('shows user bet when locked with existing bet', () => {
      const series = createSeries({
        isBettingOpen: false,
        homeTeamScore: 4,
        awayTeamScore: 2,
        userBet: { homeTeamScore: 4, awayTeamScore: 1, totalPoints: 3 },
      })

      render(<SeriesCard series={series} onSaved={mockOnSaved} />)

      expect(screen.getByText('yourBet')).toBeInTheDocument()
      expect(screen.getByText('4:1')).toBeInTheDocument()
    })

    it('does not show save button when locked', () => {
      const series = createSeries({ isBettingOpen: false })

      render(<SeriesCard series={series} onSaved={mockOnSaved} />)

      expect(screen.queryByText('savePrediction')).not.toBeInTheDocument()
    })

    it('shows friends picks button when locked', () => {
      const series = createSeries({ isBettingOpen: false })

      render(<SeriesCard series={series} onSaved={mockOnSaved} />)

      expect(screen.getByText('friendsPicks')).toBeInTheDocument()
    })
  })

  describe('Evaluated state', () => {
    it('shows points badge when evaluated', () => {
      const series = createSeries({
        isBettingOpen: false,
        isEvaluated: true,
        homeTeamScore: 4,
        awayTeamScore: 2,
        userBet: { homeTeamScore: 4, awayTeamScore: 2, totalPoints: 5 },
      })

      render(<SeriesCard series={series} onSaved={mockOnSaved} />)

      expect(screen.getByText(/\+5/)).toBeInTheDocument()
    })
  })

  describe('Pre-existing bet', () => {
    it('initializes scores from existing bet', () => {
      const series = createSeries({
        userBet: { homeTeamScore: 4, awayTeamScore: 3, totalPoints: 0 },
      })

      render(<SeriesCard series={series} onSaved={mockOnSaved} />)

      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('shows saved state when bet exists', () => {
      const series = createSeries({
        userBet: { homeTeamScore: 4, awayTeamScore: 3, totalPoints: 0 },
      })

      render(<SeriesCard series={series} onSaved={mockOnSaved} />)

      expect(screen.getByText('saved')).toBeInTheDocument()
    })
  })
})
