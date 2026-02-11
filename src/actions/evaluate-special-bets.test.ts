import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateSpecialBetBets } from './evaluate-special-bets'
import * as authUtils from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { updateTag, revalidatePath } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/evaluation/special-bet-evaluator', () => ({
  evaluateSpecialBetAtomic: vi.fn(),
}))

import { evaluateSpecialBetAtomic } from '@/lib/evaluation/special-bet-evaluator'

const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)
const mockEvaluateSpecialBetAtomic = vi.mocked(evaluateSpecialBetAtomic)
const mockUpdateTag = vi.mocked(updateTag)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockAuditLogger = vi.mocked(AuditLogger)

const adminSession = { user: { id: '1', isSuperadmin: true } } as any

const evaluatorResult = {
  success: true,
  results: [
    {
      userId: 10,
      totalPoints: 20,
      evaluatorResults: [
        { evaluatorName: 'exact_team', awarded: true, points: 20 },
      ],
    },
  ],
  totalUsersEvaluated: 1,
}

describe('evaluateSpecialBetBets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminSession)
    mockEvaluateSpecialBetAtomic.mockResolvedValue(evaluatorResult)
    mockAuditLogger.specialBetEvaluated.mockResolvedValue(undefined as any)
  })

  it('should return success and delegate to evaluateSpecialBetAtomic', async () => {
    const result = await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result).toMatchObject({
      results: evaluatorResult.results,
      totalUsersEvaluated: 1,
    })
    expect(mockEvaluateSpecialBetAtomic).toHaveBeenCalledWith({
      specialBetId: 7,
      userId: undefined,
    })
  })

  it('should pass userId to evaluator when provided', async () => {
    await evaluateSpecialBetBets({ specialBetId: 7, userId: 42 })

    expect(mockEvaluateSpecialBetAtomic).toHaveBeenCalledWith({
      specialBetId: 7,
      userId: 42,
    })
  })

  it('should invalidate special-bet-data and leaderboard caches', async () => {
    await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(mockUpdateTag).toHaveBeenCalledWith('special-bet-data')
  })

  it('should revalidate admin path', async () => {
    await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('should call AuditLogger.specialBetEvaluated with correct params', async () => {
    await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(mockAuditLogger.specialBetEvaluated).toHaveBeenCalledWith(
      1, // Number(session.user.id)
      7, // specialBetId
      1, // totalUsersEvaluated
      20, // totalPoints
      expect.any(Number) // durationMs
    )
  })

  it('should return error for invalid specialBetId', async () => {
    const result = await evaluateSpecialBetBets({ specialBetId: -1 })

    expect(result.success).toBe(false)
    expect(mockEvaluateSpecialBetAtomic).not.toHaveBeenCalled()
  })

  it('should return error for zero specialBetId', async () => {
    const result = await evaluateSpecialBetBets({ specialBetId: 0 })

    expect(result.success).toBe(false)
  })

  it('should return error for non-integer specialBetId', async () => {
    const result = await evaluateSpecialBetBets({ specialBetId: 3.7 })

    expect(result.success).toBe(false)
  })

  it('should return error when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

    const result = await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Unauthorized')
  })

  it('should return error when evaluator throws', async () => {
    mockEvaluateSpecialBetAtomic.mockRejectedValue(
      new Error('Cannot evaluate special bet without result')
    )

    const result = await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Cannot evaluate special bet without result')
  })

  it('should handle evaluator with no user bets', async () => {
    mockEvaluateSpecialBetAtomic.mockResolvedValue({
      success: true,
      results: [],
      totalUsersEvaluated: 0,
    })

    const result = await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(result.success).toBe(true)
    expect(result).toMatchObject({ totalUsersEvaluated: 0 })
  })

  it('should handle multiple user results and sum total points correctly', async () => {
    mockEvaluateSpecialBetAtomic.mockResolvedValue({
      success: true,
      results: [
        { userId: 1, totalPoints: 20, evaluatorResults: [] },
        { userId: 2, totalPoints: 20, evaluatorResults: [] },
        { userId: 3, totalPoints: 0, evaluatorResults: [] },
      ],
      totalUsersEvaluated: 3,
    })

    await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(mockAuditLogger.specialBetEvaluated).toHaveBeenCalledWith(
      1, 7, 3, 40, expect.any(Number)
    )
  })

  it('should not fail if audit logger throws', async () => {
    mockAuditLogger.specialBetEvaluated.mockRejectedValue(new Error('Logging failed'))

    const result = await evaluateSpecialBetBets({ specialBetId: 7 })

    expect(result.success).toBe(true)
  })
})
