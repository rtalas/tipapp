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

const mockPrisma = vi.mocked(prisma, true)
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
      expect((result as any).error).toBe('Test not found')
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
      expect((result as any).error).toBe('Betting is closed')
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

  describe('concurrent bet race conditions', () => {
    beforeEach(() => {
      baseConfig.findLeagueId.mockResolvedValue(1)
    })

    it('should propagate serialization failure when concurrent transactions conflict', async () => {
      // Simulate PostgreSQL P2034 serialization error thrown by Prisma
      const serializationError = new Error(
        'Transaction failed due to a write conflict or a deadlock. Please retry your transaction'
      )
      serializationError.name = 'PrismaClientKnownRequestError'
      ;(serializationError as any).code = 'P2034'

      mockPrisma.$transaction.mockRejectedValue(serializationError)

      // The serialization error is not an AppError, so it should be rethrown
      await expect(
        saveUserBet({
          ...baseConfig,
          input: { entityId: 1, value: 'test' },
        })
      ).rejects.toThrow('Transaction failed due to a write conflict')
    })

    it('should succeed for first caller and fail for second on concurrent bets', async () => {
      let callCount = 0

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        callCount++
        if (callCount === 1) {
          // First transaction succeeds
          return fn({})
        }
        // Second transaction gets serialization failure from PostgreSQL
        const error = new Error(
          'Transaction failed due to a write conflict or a deadlock. Please retry your transaction'
        )
        ;(error as any).code = 'P2034'
        throw error
      })

      baseConfig.runTransaction.mockResolvedValue(false)

      // Fire two concurrent saves
      const [result1, result2] = await Promise.allSettled([
        saveUserBet({ ...baseConfig, input: { entityId: 1, value: 'bet-a' } }),
        saveUserBet({ ...baseConfig, input: { entityId: 1, value: 'bet-b' } }),
      ])

      // First succeeds
      expect(result1.status).toBe('fulfilled')
      if (result1.status === 'fulfilled') {
        expect(result1.value).toEqual({ success: true })
      }

      // Second is rejected with serialization error (not swallowed)
      expect(result2.status).toBe('rejected')
      if (result2.status === 'rejected') {
        expect(result2.reason.message).toContain('write conflict')
      }
    })

    it('should not produce duplicate bets when transaction retries after conflict', async () => {
      const createCalls: unknown[] = []

      // First call: transaction succeeds with create
      // Second call: transaction succeeds but finds existing bet → update
      let callCount = 0
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        callCount++
        const tx = {
          findFirst: vi.fn().mockResolvedValue(
            callCount === 1 ? null : { id: 99 } // first: no bet, second: bet exists
          ),
          create: vi.fn().mockImplementation((data: unknown) => {
            createCalls.push(data)
            return { id: callCount }
          }),
          update: vi.fn(),
        }
        return fn(tx)
      })

      // Simulate: first creates, second finds the created bet and updates
      baseConfig.runTransaction
        .mockResolvedValueOnce(false) // first: created
        .mockResolvedValueOnce(true)  // second: updated

      const [r1, r2] = await Promise.all([
        saveUserBet({ ...baseConfig, input: { entityId: 1, value: 'bet-a' } }),
        saveUserBet({ ...baseConfig, input: { entityId: 1, value: 'bet-b' } }),
      ])

      expect(r1.success).toBe(true)
      expect(r2.success).toBe(true)
      // One create audit and one update audit — not two creates
      expect(baseConfig.audit.onCreated).toHaveBeenCalledTimes(1)
      expect(baseConfig.audit.onUpdated).toHaveBeenCalledTimes(1)
    })

    it('should reject Prisma unique constraint violation on concurrent create', async () => {
      // Simulate P2002 unique constraint violation
      const uniqueError = new Error(
        'Unique constraint failed on the fields: (`leagueMatchId`,`leagueUserId`,`deletedAt`)'
      )
      uniqueError.name = 'PrismaClientKnownRequestError'
      ;(uniqueError as any).code = 'P2002'

      mockPrisma.$transaction.mockRejectedValue(uniqueError)

      await expect(
        saveUserBet({
          ...baseConfig,
          input: { entityId: 1, value: 'test' },
        })
      ).rejects.toThrow('Unique constraint failed')
    })
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
      getLeagueId: (e: any) => e.leagueId,
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
      getLeagueId: (e: any) => e.leagueId,
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
      getLeagueId: (e: any) => e.leagueId,
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
      getLeagueId: (e: any) => e.leagueId,
      getDateTime: () => new Date('2099-01-01'),
      findPredictions: vi.fn(),
    })

    expect(mockRequireLeagueMember).toHaveBeenCalledWith(7)
  })
})
