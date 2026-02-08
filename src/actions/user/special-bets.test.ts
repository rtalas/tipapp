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

const { saveSpecialBet } = await import('./special-bets')

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

const mockSpecialBet = {
  id: 100,
  leagueId: 1,
  dateTime: new Date('2099-01-01'),
  deletedAt: null,
}

describe('saveSpecialBet', () => {
  const teamInput = {
    leagueSpecialBetSingleId: 100,
    teamResultId: 5,
    playerResultId: null,
    value: null,
  }

  const playerInput = {
    leagueSpecialBetSingleId: 100,
    teamResultId: null,
    playerResultId: 42,
    value: null,
  }

  const valueInput = {
    leagueSpecialBetSingleId: 100,
    teamResultId: null,
    playerResultId: null,
    value: 7,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue({ leagueId: 1 } as any)
    mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
    mockIsBettingOpen.mockReturnValue(true)
  })

  it('should create a new bet with team pick', async () => {
    const createMock = vi.fn()
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue(mockSpecialBet) },
        userSpecialBetSingle: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: createMock,
        },
      }
      return fn(tx)
    })

    const result = await saveSpecialBet(teamInput)

    expect(result.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leagueSpecialBetSingleId: 100,
          leagueUserId: mockLeagueUser.id,
          teamResultId: 5,
          playerResultId: null,
          value: null,
          totalPoints: 0,
        }),
      })
    )
  })

  it('should create a new bet with player pick', async () => {
    const createMock = vi.fn()
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue(mockSpecialBet) },
        userSpecialBetSingle: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: createMock,
        },
      }
      return fn(tx)
    })

    const result = await saveSpecialBet(playerInput)

    expect(result.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          playerResultId: 42,
          teamResultId: null,
          value: null,
        }),
      })
    )
  })

  it('should create a new bet with value pick', async () => {
    const createMock = vi.fn()
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue(mockSpecialBet) },
        userSpecialBetSingle: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: createMock,
        },
      }
      return fn(tx)
    })

    const result = await saveSpecialBet(valueInput)

    expect(result.success).toBe(true)
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          value: 7,
          teamResultId: null,
          playerResultId: null,
        }),
      })
    )
  })

  it('should update an existing bet', async () => {
    const existingBet = { id: 50, leagueSpecialBetSingleId: 100, leagueUserId: 10 }
    const updateMock = vi.fn()

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue(mockSpecialBet) },
        userSpecialBetSingle: {
          findFirst: vi.fn().mockResolvedValue(existingBet),
          update: updateMock,
        },
      }
      return fn(tx)
    })

    const result = await saveSpecialBet(teamInput)

    expect(result.success).toBe(true)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 50 },
        data: expect.objectContaining({
          teamResultId: 5,
          playerResultId: null,
          value: null,
        }),
      })
    )
  })

  it('should return error when special bet not found (pre-transaction)', async () => {
    mockPrisma.leagueSpecialBetSingle.findUnique.mockResolvedValue(null)

    const result = await saveSpecialBet(teamInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Special bet not found')
  })

  it('should return error when special bet not found (inside transaction)', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue(null) },
        userSpecialBetSingle: { findFirst: vi.fn() },
      }
      return fn(tx)
    })

    const result = await saveSpecialBet(teamInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Special bet not found')
  })

  it('should return error when betting is closed', async () => {
    mockIsBettingOpen.mockReturnValue(false)

    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue(mockSpecialBet) },
        userSpecialBetSingle: { findFirst: vi.fn() },
      }
      return fn(tx)
    })

    const result = await saveSpecialBet(teamInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Betting is closed')
  })

  it('should reject when no prediction field is set', async () => {
    const result = await saveSpecialBet({
      leagueSpecialBetSingleId: 100,
      teamResultId: null,
      playerResultId: null,
      value: null,
    })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Exactly one prediction')
  })

  it('should reject when multiple prediction fields are set', async () => {
    const result = await saveSpecialBet({
      leagueSpecialBetSingleId: 100,
      teamResultId: 5,
      playerResultId: 42,
      value: null,
    })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Exactly one prediction')
  })

  it('should reject invalid special bet ID', async () => {
    const result = await saveSpecialBet({
      ...teamInput,
      leagueSpecialBetSingleId: -5,
    })

    expect(result.success).toBe(false)
  })

  it('should use Serializable isolation level', async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: any, opts: any) => {
      expect(opts.isolationLevel).toBe('Serializable')
      const tx = {
        leagueSpecialBetSingle: { findUnique: vi.fn().mockResolvedValue(mockSpecialBet) },
        userSpecialBetSingle: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
        },
      }
      return fn(tx)
    })

    await saveSpecialBet(teamInput)

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

    await expect(saveSpecialBet(teamInput)).rejects.toThrow('Serialization failure')
  })

  it('should not throw for AppError inside transaction', async () => {
    mockPrisma.$transaction.mockRejectedValue(
      new AppError('Betting is closed for this special bet', 'BETTING_CLOSED', 400)
    )

    const result = await saveSpecialBet(teamInput)

    expect(result.success).toBe(false)
    expect((result as any).error).toBe('Betting is closed for this special bet')
  })
})
