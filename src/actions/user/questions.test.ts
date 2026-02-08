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

const { saveQuestionBet } = await import('./questions')

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
