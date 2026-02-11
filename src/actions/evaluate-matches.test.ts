import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateMatchBets } from './evaluate-matches'
import * as authUtils from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { updateTag, revalidatePath } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/evaluation/match-evaluator', () => ({
  evaluateMatchAtomic: vi.fn(),
}))

import { evaluateMatchAtomic } from '@/lib/evaluation/match-evaluator'

const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)
const mockEvaluateMatchAtomic = vi.mocked(evaluateMatchAtomic)
const mockUpdateTag = vi.mocked(updateTag)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockAuditLogger = vi.mocked(AuditLogger)

const adminSession = { user: { id: '1', isSuperadmin: true } } as any

const evaluatorResult = {
  success: true,
  results: [
    {
      userId: 10,
      totalPoints: 15,
      evaluatorResults: [
        { evaluatorName: 'winner', awarded: true, points: 5 },
        { evaluatorName: 'exact_score', awarded: true, points: 10 },
      ],
    },
  ],
  totalUsersEvaluated: 1,
}

describe('evaluateMatchBets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminSession)
    mockEvaluateMatchAtomic.mockResolvedValue(evaluatorResult)
    mockAuditLogger.matchEvaluated.mockResolvedValue(undefined as any)
  })

  it('should return success and delegate to evaluateMatchAtomic', async () => {
    const result = await evaluateMatchBets({
      leagueMatchId: 100,
      matchId: 1,
    })

    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result).toMatchObject({
      results: evaluatorResult.results,
      totalUsersEvaluated: 1,
    })
    expect(mockEvaluateMatchAtomic).toHaveBeenCalledWith({
      matchId: 1,
      leagueMatchId: 100,
      userId: undefined,
    })
  })

  it('should pass userId to evaluator when provided', async () => {
    await evaluateMatchBets({
      leagueMatchId: 100,
      matchId: 1,
      userId: 42,
    })

    expect(mockEvaluateMatchAtomic).toHaveBeenCalledWith({
      matchId: 1,
      leagueMatchId: 100,
      userId: 42,
    })
  })

  it('should invalidate match-data and leaderboard caches', async () => {
    await evaluateMatchBets({ leagueMatchId: 100, matchId: 1 })

    expect(mockUpdateTag).toHaveBeenCalledWith('match-data')
  })

  it('should revalidate admin path', async () => {
    await evaluateMatchBets({ leagueMatchId: 100, matchId: 1 })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('should call AuditLogger.matchEvaluated with correct params', async () => {
    await evaluateMatchBets({ leagueMatchId: 100, matchId: 1 })

    expect(mockAuditLogger.matchEvaluated).toHaveBeenCalledWith(
      1, // Number(session.user.id)
      1, // matchId
      1, // totalUsersEvaluated
      15, // totalPoints (sum of all user results)
      expect.any(Number) // durationMs
    )
  })

  it('should return error for invalid leagueMatchId', async () => {
    const result = await evaluateMatchBets({
      leagueMatchId: -1,
      matchId: 1,
    })

    expect(result.success).toBe(false)
    expect(mockEvaluateMatchAtomic).not.toHaveBeenCalled()
  })

  it('should return error for invalid matchId', async () => {
    const result = await evaluateMatchBets({
      leagueMatchId: 100,
      matchId: 0,
    })

    expect(result.success).toBe(false)
    expect(mockEvaluateMatchAtomic).not.toHaveBeenCalled()
  })

  it('should return error for non-integer input', async () => {
    const result = await evaluateMatchBets({
      leagueMatchId: 1.5,
      matchId: 1,
    })

    expect(result.success).toBe(false)
  })

  it('should return error when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

    const result = await evaluateMatchBets({
      leagueMatchId: 100,
      matchId: 1,
    })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Unauthorized')
  })

  it('should return error when evaluator throws', async () => {
    mockEvaluateMatchAtomic.mockRejectedValue(
      new Error('Cannot evaluate match without results')
    )

    const result = await evaluateMatchBets({
      leagueMatchId: 100,
      matchId: 1,
    })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Cannot evaluate match without results')
  })

  it('should handle evaluator with no user bets', async () => {
    mockEvaluateMatchAtomic.mockResolvedValue({
      success: true,
      results: [],
      totalUsersEvaluated: 0,
    })

    const result = await evaluateMatchBets({
      leagueMatchId: 100,
      matchId: 1,
    })

    expect(result.success).toBe(true)
    expect(result).toMatchObject({ totalUsersEvaluated: 0 })
  })

  it('should handle multiple user results and sum total points correctly', async () => {
    mockEvaluateMatchAtomic.mockResolvedValue({
      success: true,
      results: [
        { userId: 1, totalPoints: 10, evaluatorResults: [] },
        { userId: 2, totalPoints: 5, evaluatorResults: [] },
        { userId: 3, totalPoints: 0, evaluatorResults: [] },
      ],
      totalUsersEvaluated: 3,
    })

    await evaluateMatchBets({ leagueMatchId: 100, matchId: 1 })

    // Audit logger should receive sum of all user points (10 + 5 + 0 = 15)
    expect(mockAuditLogger.matchEvaluated).toHaveBeenCalledWith(
      1, 1, 3, 15, expect.any(Number)
    )
  })

  it('should not fail if audit logger throws', async () => {
    mockAuditLogger.matchEvaluated.mockRejectedValue(new Error('Logging failed'))

    const result = await evaluateMatchBets({
      leagueMatchId: 100,
      matchId: 1,
    })

    // Action should still succeed despite audit log failure
    expect(result.success).toBe(true)
  })
})
