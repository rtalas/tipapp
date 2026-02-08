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

const { saveSeriesBet } = await import('./series')

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

const mockSeries = {
  id: 100,
  leagueId: 1,
  dateTime: new Date('2099-01-01'),
  deletedAt: null,
}

describe('saveSeriesBet', () => {
  const validInput = {
    leagueSpecialBetSerieId: 100,
    homeTeamScore: 4,
    awayTeamScore: 2,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.leagueSpecialBetSerie.findUnique.mockResolvedValue({ leagueId: 1 } as any)
    mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
    mockIsBettingOpen.mockReturnValue(true)
  })

  it('should create a new bet successfully', async () => {
    const createMock = vi.fn()
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue(mockSeries) },
        userSpecialBetSerie: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: createMock,
        },
      }
      return fn(tx)
    })

    const result = await saveSeriesBet(validInput)

    expect(result.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueSpecialBetSerieId: 100,
          leagueUserId: mockLeagueUser.id,
          homeTeamScore: 4,
          awayTeamScore: 2,
          totalPoints: 0,
        }),
      })
    )
  })

  it('should update an existing bet', async () => {
    const existingBet = { id: 50, leagueSpecialBetSerieId: 100, leagueUserId: 10 }
    const updateMock = vi.fn()

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue(mockSeries) },
        userSpecialBetSerie: {
          findFirst: vi.fn().mockResolvedValue(existingBet),
          update: updateMock,
        },
      }
      return fn(tx)
    })

    const result = await saveSeriesBet(validInput)

    expect(result.success).toBe(true)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 50 },
        data: expect.objectContaining({
          homeTeamScore: 4,
          awayTeamScore: 2,
        }),
      })
    )
  })

  it('should return error when series not found (pre-transaction)', async () => {
    mockPrisma.leagueSpecialBetSerie.findUnique.mockResolvedValue(null)

    const result = await saveSeriesBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Series not found')
  })

  it('should return error when series not found (inside transaction)', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue(null) },
        userSpecialBetSerie: { findFirst: vi.fn() },
      }
      return fn(tx)
    })

    const result = await saveSeriesBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Series not found')
  })

  it('should return error when betting is closed', async () => {
    mockIsBettingOpen.mockReturnValue(false)

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue(mockSeries) },
        userSpecialBetSerie: { findFirst: vi.fn() },
      }
      return fn(tx)
    })

    const result = await saveSeriesBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Betting is closed')
  })

  it('should reject when neither team has 4 wins', async () => {
    const result = await saveSeriesBet({
      leagueSpecialBetSerieId: 100,
      homeTeamScore: 3,
      awayTeamScore: 3,
    })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('4 wins')
  })

  it('should reject negative scores', async () => {
    const result = await saveSeriesBet({
      leagueSpecialBetSerieId: 100,
      homeTeamScore: -1,
      awayTeamScore: 4,
    })

    expect(result.success).toBe(false)
  })

  it('should reject scores above 7', async () => {
    const result = await saveSeriesBet({
      leagueSpecialBetSerieId: 100,
      homeTeamScore: 8,
      awayTeamScore: 4,
    })

    expect(result.success).toBe(false)
  })

  it('should reject invalid series ID', async () => {
    const result = await saveSeriesBet({
      ...validInput,
      leagueSpecialBetSerieId: -5,
    })

    expect(result.success).toBe(false)
  })

  it('should use Serializable isolation level', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any, opts: any) => {
      expect(opts.isolationLevel).toBe('Serializable')
      const tx = {
        leagueSpecialBetSerie: { findUnique: vi.fn().mockResolvedValue(mockSeries) },
        userSpecialBetSerie: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
        },
      }
      return fn(tx)
    })

    await saveSeriesBet(validInput)

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

    await expect(saveSeriesBet(validInput)).rejects.toThrow('Serialization failure')
  })

  it('should not throw for AppError inside transaction', async () => {
    mockPrisma.$transaction.mockRejectedValue(
      new AppError('Betting is closed for this series', 'BETTING_CLOSED', 400)
    )

    const result = await saveSeriesBet(validInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Betting is closed for this series')
  })
})
