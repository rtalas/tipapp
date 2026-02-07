import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import * as userAuthUtils from '@/lib/auth/user-auth-utils'
import { AppError } from '@/lib/error-handler'
import { z } from 'zod'

vi.mock('@/lib/auth/user-auth-utils', () => ({
  requireLeagueMember: vi.fn(),
  isBettingOpen: vi.fn(),
}))

const { saveUserBet, getFriendPredictions } = await import('./bet-utils')

const mockPrisma = vi.mocked(prisma)
const mockRequireLeagueMember = vi.mocked(userAuthUtils.requireLeagueMember)
const mockIsBettingOpen = vi.mocked(userAuthUtils.isBettingOpen)

const mockMemberResult = {
  session: { user: { id: '5' } },
  leagueUser: { id: 10, leagueId: 1, userId: 5, admin: false, active: true, paid: true },
  userId: 5,
} as any

const testSchema = z.object({
  entityId: z.number().int().positive(),
  value: z.string(),
})

describe('saveUserBet', () => {
  const baseConfig = {
    schema: testSchema,
    entityLabel: 'Test',
    findLeagueId: vi.fn(),
    runTransaction: vi.fn(),
    audit: {
      getEntityId: (v: { entityId: number }) => v.entityId,
      getMetadata: (v: { value: string }) => ({ value: v.value }),
      onCreated: vi.fn().mockResolvedValue(undefined),
      onUpdated: vi.fn().mockResolvedValue(undefined),
    },
    revalidatePathSuffix: '/tests',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
  })

  it('should return validation error for invalid input', async () => {
    const result = await saveUserBet({
      ...baseConfig,
      input: { entityId: -1, value: 'x' },
    })

    expect(result.success).toBe(false)
    expect('error' in result && result.error).toBeTruthy()
  })

  it('should return not found when entity has no leagueId', async () => {
    baseConfig.findLeagueId.mockResolvedValue(null)

    const result = await saveUserBet({
      ...baseConfig,
      input: { entityId: 1, value: 'test' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Test not found')
    }
  })

  it('should call requireLeagueMember with correct leagueId', async () => {
    baseConfig.findLeagueId.mockResolvedValue(42)
    baseConfig.runTransaction.mockResolvedValue(false)
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({}))

    await saveUserBet({
      ...baseConfig,
      input: { entityId: 1, value: 'test' },
    })

    expect(mockRequireLeagueMember).toHaveBeenCalledWith(42)
  })

  it('should run transaction with Serializable isolation', async () => {
    baseConfig.findLeagueId.mockResolvedValue(1)
    baseConfig.runTransaction.mockResolvedValue(false)
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({}))

    await saveUserBet({
      ...baseConfig,
      input: { entityId: 1, value: 'test' },
    })

    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      })
    )
  })

  it('should call onCreated when transaction returns false (new bet)', async () => {
    baseConfig.findLeagueId.mockResolvedValue(1)
    baseConfig.runTransaction.mockResolvedValue(false)
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({}))

    await saveUserBet({
      ...baseConfig,
      input: { entityId: 5, value: 'test' },
    })

    expect(baseConfig.audit.onCreated).toHaveBeenCalledWith(
      5, 1, 5,
      { value: 'test' },
      expect.any(Number)
    )
    expect(baseConfig.audit.onUpdated).not.toHaveBeenCalled()
  })

  it('should call onUpdated when transaction returns true (existing bet)', async () => {
    baseConfig.findLeagueId.mockResolvedValue(1)
    baseConfig.runTransaction.mockResolvedValue(true)
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({}))

    await saveUserBet({
      ...baseConfig,
      input: { entityId: 5, value: 'test' },
    })

    expect(baseConfig.audit.onUpdated).toHaveBeenCalledWith(
      5, 1, 5,
      { value: 'test' },
      expect.any(Number)
    )
    expect(baseConfig.audit.onCreated).not.toHaveBeenCalled()
  })

  it('should return success true on successful save', async () => {
    baseConfig.findLeagueId.mockResolvedValue(1)
    baseConfig.runTransaction.mockResolvedValue(false)
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({}))

    const result = await saveUserBet({
      ...baseConfig,
      input: { entityId: 1, value: 'test' },
    })

    expect(result).toEqual({ success: true })
  })

  it('should catch AppError and return error message', async () => {
    baseConfig.findLeagueId.mockResolvedValue(1)
    mockPrisma.$transaction.mockRejectedValue(
      new AppError('Betting is closed', 'BETTING_CLOSED', 400)
    )

    const result = await saveUserBet({
      ...baseConfig,
      input: { entityId: 1, value: 'test' },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Betting is closed')
    }
  })

  it('should rethrow non-AppError errors', async () => {
    baseConfig.findLeagueId.mockResolvedValue(1)
    mockPrisma.$transaction.mockRejectedValue(new Error('DB crash'))

    await expect(
      saveUserBet({
        ...baseConfig,
        input: { entityId: 1, value: 'test' },
      })
    ).rejects.toThrow('DB crash')
  })

  it('should not fail if audit log throws', async () => {
    baseConfig.findLeagueId.mockResolvedValue(1)
    baseConfig.runTransaction.mockResolvedValue(false)
    baseConfig.audit.onCreated.mockRejectedValue(new Error('Audit failed'))
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn({}))

    const result = await saveUserBet({
      ...baseConfig,
      input: { entityId: 1, value: 'test' },
    })

    // Should still succeed since audit is fire-and-forget
    expect(result).toEqual({ success: true })
  })
})

describe('getFriendPredictions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
  })

  it('should throw when entity not found', async () => {
    await expect(
      getFriendPredictions({
        entityId: 999,
        entityLabel: 'Match',
        findEntity: vi.fn().mockResolvedValue(null),
        getLeagueId: () => 1,
        getDateTime: () => new Date(),
        findPredictions: vi.fn(),
      })
    ).rejects.toThrow('Match not found')
  })

  it('should return empty predictions when betting is open', async () => {
    mockIsBettingOpen.mockReturnValue(true)

    const result = await getFriendPredictions({
      entityId: 1,
      entityLabel: 'Match',
      findEntity: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }),
      getLeagueId: (e) => e.leagueId,
      getDateTime: () => new Date('2099-01-01'),
      findPredictions: vi.fn(),
    })

    expect(result.isLocked).toBe(false)
    expect(result.predictions).toHaveLength(0)
  })

  it('should return predictions when betting is closed', async () => {
    mockIsBettingOpen.mockReturnValue(false)
    const mockPredictions = [
      { id: 1, userId: 20, homeScore: 2 },
      { id: 2, userId: 30, homeScore: 3 },
    ]

    const result = await getFriendPredictions({
      entityId: 1,
      entityLabel: 'Match',
      findEntity: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }),
      getLeagueId: (e) => e.leagueId,
      getDateTime: () => new Date('2020-01-01'),
      findPredictions: vi.fn().mockResolvedValue(mockPredictions),
    })

    expect(result.isLocked).toBe(true)
    expect(result.predictions).toEqual(mockPredictions)
  })

  it('should pass correct excludeLeagueUserId to findPredictions', async () => {
    mockIsBettingOpen.mockReturnValue(false)
    const findPredictions = vi.fn().mockResolvedValue([])

    await getFriendPredictions({
      entityId: 42,
      entityLabel: 'Series',
      findEntity: vi.fn().mockResolvedValue({ id: 42, leagueId: 1 }),
      getLeagueId: (e) => e.leagueId,
      getDateTime: () => new Date('2020-01-01'),
      findPredictions,
    })

    expect(findPredictions).toHaveBeenCalledWith(42, 10)
  })

  it('should call requireLeagueMember with entity leagueId', async () => {
    mockIsBettingOpen.mockReturnValue(true)

    await getFriendPredictions({
      entityId: 1,
      entityLabel: 'Question',
      findEntity: vi.fn().mockResolvedValue({ id: 1, leagueId: 7 }),
      getLeagueId: (e) => e.leagueId,
      getDateTime: () => new Date('2099-01-01'),
      findPredictions: vi.fn(),
    })

    expect(mockRequireLeagueMember).toHaveBeenCalledWith(7)
  })
})
