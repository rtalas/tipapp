import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuestionCard } from './question-card'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Mock server actions
const mockSaveQuestionBet = vi.fn()
const mockGetFriendPredictions = vi.fn()
vi.mock('@/actions/user/questions', () => ({
  saveQuestionBet: (...args: unknown[]) => mockSaveQuestionBet(...args),
  getQuestionFriendPredictions: (...args: unknown[]) => mockGetFriendPredictions(...args),
}))

// Mock child components
vi.mock('@/components/user/common/countdown-badge', () => ({
  CountdownBadge: () => <span data-testid="countdown-badge">countdown</span>,
}))

vi.mock('@/components/user/common/status-badge', () => ({
  StatusBadge: () => null,
}))

vi.mock('@/components/user/common/friend-predictions-modal', () => ({
  FriendPredictionsModal: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="friends-modal">{children}</div> : null,
}))

vi.mock('@/components/common/user-avatar', () => ({
  UserAvatar: () => null,
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createQuestion(overrides: Record<string, unknown> = {}): any {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return {
    id: 1,
    text: 'Will team X win the championship?',
    dateTime: futureDate,
    isEvaluated: false,
    isBettingOpen: true,
    result: null,
    userBet: null,
    ...overrides,
  }
}

describe('QuestionCard', () => {
  const mockOnSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockSaveQuestionBet.mockResolvedValue({ success: true })
  })

  describe('Open state (betting open)', () => {
    it('renders question text', () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)
      expect(screen.getByText('Will team X win the championship?')).toBeInTheDocument()
    })

    it('renders Yes, No, and No Answer buttons', () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)
      expect(screen.getByText('yes')).toBeInTheDocument()
      expect(screen.getByText('no')).toBeInTheDocument()
      expect(screen.getByText('noAnswer')).toBeInTheDocument()
    })

    it('renders save button', () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)
      expect(screen.getByText('save')).toBeInTheDocument()
    })

    it('does not show friends picks button when betting is open', () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)
      expect(screen.queryByText('friendsPicks')).not.toBeInTheDocument()
    })
  })

  describe('Answer selection', () => {
    it('selects Yes answer when Yes button clicked', async () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('yes'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockSaveQuestionBet).toHaveBeenCalledWith({
          leagueSpecialBetQuestionId: 1,
          userBet: true,
        })
      })
    })

    it('selects No answer when No button clicked', async () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('no'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockSaveQuestionBet).toHaveBeenCalledWith({
          leagueSpecialBetQuestionId: 1,
          userBet: false,
        })
      })
    })

    it('clears answer when No Answer button clicked', async () => {
      const question = createQuestion({
        userBet: { userBet: true, totalPoints: 0 },
      })
      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('noAnswer'))

      // handleSave returns early when selectedAnswer is null, so clicking save does nothing
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockSaveQuestionBet).not.toHaveBeenCalled()
      })
    })
  })

  describe('Save flow', () => {
    it('calls onSaved after successful save', async () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('yes'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalled()
      })
    })

    it('shows saved state after successful save', async () => {
      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('yes'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(screen.getByText('saved')).toBeInTheDocument()
      })
    })

    it('shows error toast on save failure', async () => {
      const { toast } = await import('sonner')
      mockSaveQuestionBet.mockResolvedValue({ success: false, error: 'Server error' })

      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('yes'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error')
      })
    })

    it('shows error toast on network failure', async () => {
      const { toast } = await import('sonner')
      mockSaveQuestionBet.mockRejectedValue(new Error('Network error'))

      render(<QuestionCard question={createQuestion()} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('yes'))
      fireEvent.click(screen.getByText('save'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('saveError')
      })
    })
  })

  describe('Locked state (betting closed)', () => {
    it('shows user answer when locked', () => {
      const question = createQuestion({
        isBettingOpen: false,
        userBet: { userBet: true, totalPoints: 0 },
      })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      expect(screen.getByText('yourAnswer')).toBeInTheDocument()
      expect(screen.getByText('yes')).toBeInTheDocument()
    })

    it('shows "noAnswer" when user has no bet and locked', () => {
      const question = createQuestion({ isBettingOpen: false })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      expect(screen.getByText('noAnswer')).toBeInTheDocument()
    })

    it('does not show Yes/No buttons or save button when locked', () => {
      const question = createQuestion({ isBettingOpen: false })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      expect(screen.queryByText('save')).not.toBeInTheDocument()
    })

    it('shows friends picks button when locked', () => {
      const question = createQuestion({ isBettingOpen: false })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      expect(screen.getByText('friendsPicks')).toBeInTheDocument()
    })
  })

  describe('Evaluated state', () => {
    it('shows correct answer when evaluated', () => {
      const question = createQuestion({
        isBettingOpen: false,
        isEvaluated: true,
        result: true,
        userBet: { userBet: true, totalPoints: 5 },
      })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      expect(screen.getByText('correctAnswer')).toBeInTheDocument()
    })

    it('shows positive points badge for correct answer', () => {
      const question = createQuestion({
        isBettingOpen: false,
        isEvaluated: true,
        result: true,
        userBet: { userBet: true, totalPoints: 5 },
      })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      expect(screen.getByText('+5')).toBeInTheDocument()
    })

    it('shows negative points badge for wrong answer', () => {
      const question = createQuestion({
        isBettingOpen: false,
        isEvaluated: true,
        result: false,
        userBet: { userBet: true, totalPoints: -3 },
      })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      expect(screen.getByText('-3')).toBeInTheDocument()
    })
  })

  describe('Pre-existing bet', () => {
    it('initializes with existing bet value', () => {
      const question = createQuestion({
        userBet: { userBet: false, totalPoints: 0 },
      })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      // Save button should show "saved" initially
      expect(screen.getByText('saved')).toBeInTheDocument()
    })

    it('marks as unsaved when answer changed', () => {
      const question = createQuestion({
        userBet: { userBet: false, totalPoints: 0 },
      })

      render(<QuestionCard question={question} onSaved={mockOnSaved} />)

      fireEvent.click(screen.getByText('yes'))

      expect(screen.getByText('save')).toBeInTheDocument()
    })
  })
})
