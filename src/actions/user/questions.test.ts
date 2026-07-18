import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import * as userAuthUtils from '@/lib/auth/user-auth-utils'
import { AppError } from '@/lib/error-handler'

vi.mock('@/lib/auth/user-auth-utils', () => ({
  requireLeagueMember: vi.fn(),
  isBettingOpen: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireLeagueMember = vi.mocked(userAuthUtils.requireLeagueMember)
const mockIsBettingOpen = vi.mocked(userAuthUtils.isBettingOpen)

const { saveQuestionBet, getUserQuestions } = await import('./questions')

const mockLeagueUser = {
  id: 10,
  leagueId: 1,
  userId: 5,
  admin: false,
  active: true,
  paid: true,
}

const mockMemberResult = {
  session: { user: { id: '5' } },
  leagueUser: mockLeagueUser,
  userId: 5,
} as any

const mockQuestion = {
  id: 100,
  leagueId: 1,
  dateTime: new Date('2099-01-01'),
  deletedAt: null,
}

describe('saveQuestionBet', () => {
  const validInput = {
    leagueSpecialBetQuestionId: 100,
    userBet: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue({ leagueId: 1 } as any)
    mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
    mockIsBettingOpen.mockReturnValue(true)
  })

  it('should create a new bet with answer true', async () => {
    const createMock = vi.fn()
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue(mockQuestion) },
        userSpecialBetQuestion: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: createMock,
        },
      }
      return fn(tx)
    })

    const result = await saveQuestionBet(validInput)

    expect(result.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueSpecialBetQuestionId: 100,
          leagueUserId: mockLeagueUser.id,
          userBet: true,
          totalPoints: 0,
        }),
      })
    )
  })

  it('should create a new bet with answer false', async () => {
    const createMock = vi.fn()
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue(mockQuestion) },
        userSpecialBetQuestion: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: createMock,
        },
      }
      return fn(tx)
    })

    const result = await saveQuestionBet({ ...validInput, userBet: false })

    expect(result.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userBet: false,
        }),
      })
    )
  })

  it('should update an existing bet', async () => {
    const existingBet = { id: 50, leagueSpecialBetQuestionId: 100, leagueUserId: 10 }
    const updateMock = vi.fn()

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue(mockQuestion) },
        userSpecialBetQuestion: {
          findFirst: vi.fn().mockResolvedValue(existingBet),
          update: updateMock,
        },
      }
      return fn(tx)
    })

    const result = await saveQuestionBet(validInput)

    expect(result.success).toBe(true)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 50 },
        data: expect.objectContaining({
          userBet: true,
        }),
      })
    )
  })

  it('should return error when question not found (pre-transaction)', async () => {
    mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue(null)

    const result = await saveQuestionBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Question not found')
  })

  it('should return error when question not found (inside transaction)', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue(null) },
        userSpecialBetQuestion: { findFirst: vi.fn() },
      }
      return fn(tx)
    })

    const result = await saveQuestionBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Question not found')
  })

  it('should return error when betting is closed', async () => {
    mockIsBettingOpen.mockReturnValue(false)

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue(mockQuestion) },
        userSpecialBetQuestion: { findFirst: vi.fn() },
      }
      return fn(tx)
    })

    const result = await saveQuestionBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Betting is closed')
  })

  it('should reject invalid question ID', async () => {
    const result = await saveQuestionBet({
      ...validInput,
      leagueSpecialBetQuestionId: -5,
    })

    expect(result.success).toBe(false)
  })

  it('should use Serializable isolation level', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any, opts: any) => {
      expect(opts.isolationLevel).toBe('Serializable')
      const tx = {
        leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue(mockQuestion) },
        userSpecialBetQuestion: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
        },
      }
      return fn(tx)
    })

    await saveQuestionBet(validInput)

    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      })
    )
  })

  it('should handle transaction failure', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('Serialization failure'))

    await expect(saveQuestionBet(validInput)).rejects.toThrow('Serialization failure')
  })

  it('should not throw for AppError inside transaction', async () => {
    mockPrisma.$transaction.mockRejectedValue(
      new AppError('Betting is closed for this question', 'BETTING_CLOSED', 400)
    )

    const result = await saveQuestionBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Betting is closed for this question')
  })
})

describe('getUserQuestions — game-day match windowing', () => {
  const team = (name: string) => ({ name, shortcut: name, flagIcon: null, flagType: null })

  // A leagueMatch as shaped by the `select` in getUserQuestions.
  const leagueMatch = (
    dateTime: Date,
    { phase = null, group = null }: { phase?: string | null; group?: string | null } = {}
  ) => ({
    Match: {
      dateTime,
      homePlaceholder: null,
      awayPlaceholder: null,
      MatchPhase: phase ? { name: phase } : null,
      LeagueTeam_Match_homeTeamIdToLeagueTeam: { group, Team: team('HOM') },
      LeagueTeam_Match_awayTeamIdToLeagueTeam: { Team: team('AWY') },
    },
  })

  const question = (id: number, dateTime: Date) => ({
    id,
    leagueId: 1,
    dateTime,
    deletedAt: null,
    League: { sportId: 1 },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
    mockIsBettingOpen.mockReturnValue(false)
    mockPrisma.userSpecialBetQuestion.findMany.mockResolvedValue([] as any)
  })

  it('gives every question on the same game day that day’s matches (not just the last one)', async () => {
    // Three questions, all deadlined at the same afternoon instant on 2099-06-01 (Prague).
    const q1 = question(1, new Date('2099-06-01T12:00:00Z'))
    const q2 = question(2, new Date('2099-06-01T12:00:00Z'))
    const q3 = question(3, new Date('2099-06-01T12:00:00Z'))
    // A separate game day with a single question.
    const q4 = question(4, new Date('2099-06-02T12:00:00Z'))

    // Day-1 matches: afternoon, evening, and past-midnight (< 08:00 Prague cutoff).
    const day1Matches = [
      leagueMatch(new Date('2099-06-01T13:00:00Z')),
      leagueMatch(new Date('2099-06-01T20:00:00Z')),
      leagueMatch(new Date('2099-06-02T00:30:00Z')),
    ]
    // Day-2 match: belongs only to the following game day.
    const day2Match = leagueMatch(new Date('2099-06-02T13:00:00Z'))

    mockPrisma.leagueSpecialBetQuestion.findMany.mockResolvedValue([q1, q2, q3, q4] as any)
    mockPrisma.leagueMatch.findMany.mockResolvedValue([...day1Matches, day2Match] as any)

    const result = await getUserQuestions(1)
    const byId = new Map(result.map((q: any) => [q.id, q]))

    // All three same-day questions carry the day's 3 matches.
    expect(byId.get(1)!.matches).toHaveLength(3)
    expect(byId.get(2)!.matches).toHaveLength(3)
    expect(byId.get(3)!.matches).toHaveLength(3)
    // The next game day's question stays bounded to its own match.
    expect(byId.get(4)!.matches).toHaveLength(1)
  })

  it('shows the playoff phase name instead of the stale group letter', async () => {
    const q1 = question(1, new Date('2099-06-01T12:00:00Z'))
    mockPrisma.leagueSpecialBetQuestion.findMany.mockResolvedValue([q1] as any)
    mockPrisma.leagueMatch.findMany.mockResolvedValue([
      leagueMatch(new Date('2099-06-01T13:00:00Z'), { phase: 'Čtvrtfinále', group: 'A' }),
      leagueMatch(new Date('2099-06-01T15:00:00Z'), { phase: null, group: 'B' }),
    ] as any)

    const result = await getUserQuestions(1)
    const matches = (result[0] as any).matches

    expect(matches[0].phase).toBe('Čtvrtfinále')
    expect(matches[1].phase).toBeNull()
    expect(matches[1].group).toBe('B')
  })
})
