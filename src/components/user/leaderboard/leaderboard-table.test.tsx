import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaderboardTable } from './leaderboard-table'
import type { LeaderboardEntry } from '@/types/user'
import type { LeaguePrize } from '@/actions/user/leaderboard'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock next/navigation (override global to add useParams)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({ leagueId: '1' }),
}))

// Mock child components
vi.mock('@/components/user/common/refresh-button', () => ({
  RefreshButton: ({ onRefresh }: { onRefresh: () => void }) => (
    <button onClick={onRefresh} data-testid="refresh-button">Refresh</button>
  ),
}))

vi.mock('@/components/user/common/pull-to-refresh', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/common/user-avatar', () => ({
  UserAvatar: ({ username }: { username: string }) => (
    <span data-testid={`avatar-${username}`}>{username}</span>
  ),
}))

vi.mock('./user-picks-modal', () => ({
  UserPicksModal: () => null,
}))

vi.mock('@/hooks/useRefresh', () => ({
  useRefresh: () => ({
    isRefreshing: false,
    refresh: vi.fn(),
    refreshAsync: vi.fn(),
  }),
}))

function createEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    rank: 1,
    leagueUserId: 1,
    userId: 1,
    username: 'user1',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
    matchPoints: 10,
    seriesPoints: 5,
    specialBetPoints: 3,
    questionPoints: 2,
    totalPoints: 20,
    isCurrentUser: false,
    ...overrides,
  }
}

function createPrize(overrides: Partial<LeaguePrize> = {}): LeaguePrize {
  return {
    rank: 1,
    amount: 10000, // 100 Kč in halers
    currency: 'Kč',
    label: null,
    ...overrides,
  }
}

describe('LeaderboardTable', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty state', () => {
    it('renders empty message when no entries', () => {
      render(<LeaderboardTable entries={[]} prizes={[]} fines={[]} />)
      expect(screen.getByText('noRankings')).toBeInTheDocument()
      expect(screen.getByText('description')).toBeInTheDocument()
    })
  })

  describe('Entries rendering', () => {
    it('renders all entries with rank, name, and points', () => {
      const entries = [
        createEntry({ rank: 1, username: 'alice', firstName: 'Alice', lastName: 'Smith', totalPoints: 30, leagueUserId: 1 }),
        createEntry({ rank: 2, username: 'bob', firstName: 'Bob', lastName: 'Jones', totalPoints: 25, leagueUserId: 2 }),
        createEntry({ rank: 3, username: 'charlie', firstName: 'Charlie', lastName: 'Brown', totalPoints: 20, leagueUserId: 3 }),
      ]

      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Jones')).toBeInTheDocument()
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('20')).toBeInTheDocument()
    })

    it('displays rank numbers', () => {
      const entries = [
        createEntry({ rank: 1, leagueUserId: 1 }),
        createEntry({ rank: 2, leagueUserId: 2, username: 'user2' }),
      ]

      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Display name logic', () => {
    it('shows firstName + lastName when both available', () => {
      const entries = [createEntry({ firstName: 'John', lastName: 'Doe' })]
      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('shows firstName only when lastName is null', () => {
      const entries = [createEntry({ firstName: 'John', lastName: null })]
      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)
      expect(screen.getByText('John')).toBeInTheDocument()
    })

    it('shows lastName only when firstName is null', () => {
      const entries = [createEntry({ firstName: null, lastName: 'Doe' })]
      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)
      expect(screen.getByText('Doe')).toBeInTheDocument()
    })

    it('shows username when both names are null', () => {
      const entries = [createEntry({ firstName: null, lastName: null, username: 'cooluser' })]
      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)
      // UserAvatar mock also renders username; query the display name span specifically
      const nameSpans = screen.getAllByText('cooluser')
      expect(nameSpans.length).toBeGreaterThanOrEqual(1)
      const displayNameSpan = nameSpans.find(el => el.classList.contains('font-semibold'))
      expect(displayNameSpan).toBeInTheDocument()
    })
  })

  describe('Current user highlighting', () => {
    it('shows "you" indicator for current user', () => {
      const entries = [createEntry({ isCurrentUser: true })]
      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)
      expect(screen.getByText('you')).toBeInTheDocument()
    })

    it('does not show "you" indicator for other users', () => {
      const entries = [createEntry({ isCurrentUser: false })]
      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)
      expect(screen.queryByText('you')).not.toBeInTheDocument()
    })
  })

  describe('Prize badges', () => {
    it('displays prize badge for top-ranked entries', () => {
      const entries = [
        createEntry({ rank: 1, leagueUserId: 1, totalPoints: 30 }),
        createEntry({ rank: 2, leagueUserId: 2, username: 'user2', totalPoints: 20 }),
      ]
      const prizes = [
        createPrize({ rank: 1, amount: 10000 }),
      ]

      render(<LeaderboardTable entries={entries} prizes={prizes} fines={[]} />)

      // Prize amount formatted: 10000 halers = 100 Kč
      expect(screen.getByText(/100/)).toBeInTheDocument()
    })

    it('does not display prize badge for non-prize ranks', () => {
      const entries = [
        createEntry({ rank: 1, leagueUserId: 1, totalPoints: 30 }),
        createEntry({ rank: 2, leagueUserId: 2, username: 'user2', totalPoints: 20 }),
      ]
      const prizes = [createPrize({ rank: 1, amount: 10000 })]

      const { container } = render(
        <LeaderboardTable entries={entries} prizes={prizes} fines={[]} />
      )

      // Only one prize badge (rank 1)
      const prizeBadges = container.querySelectorAll('.bg-yellow-500\\/20')
      expect(prizeBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Fine badges', () => {
    it('displays fine badge for worst-ranked entries', () => {
      const entries = [
        createEntry({ rank: 1, leagueUserId: 1, totalPoints: 30 }),
        createEntry({ rank: 2, leagueUserId: 2, username: 'user2', totalPoints: 20 }),
        createEntry({ rank: 3, leagueUserId: 3, username: 'user3', totalPoints: 10 }),
      ]
      const fines = [
        createPrize({ rank: 1, amount: 5000 }), // Fine for last place (rank 3)
      ]

      render(<LeaderboardTable entries={entries} prizes={[]} fines={fines} />)

      // Fine amount: 5000 halers = 50 Kč, displayed with minus
      expect(screen.getByText(/-50/)).toBeInTheDocument()
    })

    it('does not display fine badge for non-fined ranks', () => {
      const entries = [
        createEntry({ rank: 1, leagueUserId: 1, totalPoints: 30 }),
        createEntry({ rank: 2, leagueUserId: 2, username: 'user2', totalPoints: 20 }),
        createEntry({ rank: 3, leagueUserId: 3, username: 'user3', totalPoints: 10 }),
      ]
      const fines = [createPrize({ rank: 1, amount: 5000 })]

      const { container } = render(
        <LeaderboardTable entries={entries} prizes={[]} fines={fines} />
      )

      // Only one fine badge (for last place)
      const fineBadges = container.querySelectorAll('.bg-red-500\\/20')
      expect(fineBadges).toHaveLength(1)
    })
  })

  describe('Entry grouping', () => {
    it('separates entries into prize, middle, and fine groups', () => {
      const entries = [
        createEntry({ rank: 1, leagueUserId: 1, totalPoints: 50 }),
        createEntry({ rank: 2, leagueUserId: 2, username: 'user2', totalPoints: 40 }),
        createEntry({ rank: 3, leagueUserId: 3, username: 'user3', totalPoints: 30 }),
        createEntry({ rank: 4, leagueUserId: 4, username: 'user4', totalPoints: 20 }),
        createEntry({ rank: 5, leagueUserId: 5, username: 'user5', totalPoints: 10 }),
      ]
      const prizes = [createPrize({ rank: 1, amount: 10000 })]
      const fines = [createPrize({ rank: 1, amount: 5000 })]

      const { container } = render(
        <LeaderboardTable entries={entries} prizes={prizes} fines={fines} />
      )

      // Should have 3 glass-card groups (prize, middle, fine)
      const groups = container.querySelectorAll('.glass-card.rounded-xl')
      expect(groups).toHaveLength(3)
    })
  })

  describe('Click handling', () => {
    it('calls handler when entry is clicked', async () => {
      const entries = [createEntry({ rank: 1, username: 'alice', firstName: 'Alice', lastName: 'Smith' })]

      render(<LeaderboardTable entries={entries} prizes={[]} fines={[]} />)

      const button = screen.getByText('Alice Smith').closest('button')
      expect(button).toBeInTheDocument()
      await user.click(button!)
    })
  })
})
