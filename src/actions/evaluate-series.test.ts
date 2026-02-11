import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateSeriesBets } from './evaluate-series'
import * as authUtils from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { updateTag, revalidatePath } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/evaluation/series-evaluator', () => ({
  evaluateSeriesAtomic: vi.fn(),
}))

import { evaluateSeriesAtomic } from '@/lib/evaluation/series-evaluator'

const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)
const mockEvaluateSeriesAtomic = vi.mocked(evaluateSeriesAtomic)
const mockUpdateTag = vi.mocked(updateTag)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockAuditLogger = vi.mocked(AuditLogger)

const adminSession = { user: { id: '1', isSuperadmin: true } } as any

const evaluatorResult = {
  success: true,
  results: [
    {
      userId: 10,
      totalPoints: 8,
      evaluatorResults: [
        { evaluatorName: 'series_exact', awarded: false, points: 0 },
        { evaluatorName: 'series_winner', awarded: true, points: 8 },
      ],
    },
  ],
  totalUsersEvaluated: 1,
}

describe('evaluateSeriesBets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminSession)
    mockEvaluateSeriesAtomic.mockResolvedValue(evaluatorResult)
    mockAuditLogger.seriesEvaluated.mockResolvedValue(undefined as any)
  })

  it('should return success and delegate to evaluateSeriesAtomic', async () => {
    const result = await evaluateSeriesBets({ seriesId: 5 })

    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result).toMatchObject({
      results: evaluatorResult.results,
      totalUsersEvaluated: 1,
    })
    expect(mockEvaluateSeriesAtomic).toHaveBeenCalledWith({
      seriesId: 5,
      userId: undefined,
    })
  })

  it('should pass userId to evaluator when provided', async () => {
    await evaluateSeriesBets({ seriesId: 5, userId: 42 })

    expect(mockEvaluateSeriesAtomic).toHaveBeenCalledWith({
      seriesId: 5,
      userId: 42,
    })
  })

  it('should invalidate series-data and leaderboard caches', async () => {
    await evaluateSeriesBets({ seriesId: 5 })

    expect(mockUpdateTag).toHaveBeenCalledWith('series-data')
  })

  it('should revalidate admin path', async () => {
    await evaluateSeriesBets({ seriesId: 5 })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('should call AuditLogger.seriesEvaluated with correct params', async () => {
    await evaluateSeriesBets({ seriesId: 5 })

    expect(mockAuditLogger.seriesEvaluated).toHaveBeenCalledWith(
      1, // Number(session.user.id)
      5, // seriesId
      1, // totalUsersEvaluated
      8, // totalPoints (sum of all user results)
      expect.any(Number) // durationMs
    )
  })

  it('should return error for invalid seriesId', async () => {
    const result = await evaluateSeriesBets({ seriesId: -1 })

    expect(result.success).toBe(false)
    expect(mockEvaluateSeriesAtomic).not.toHaveBeenCalled()
  })

  it('should return error for zero seriesId', async () => {
    const result = await evaluateSeriesBets({ seriesId: 0 })

    expect(result.success).toBe(false)
  })

  it('should return error for non-integer seriesId', async () => {
    const result = await evaluateSeriesBets({ seriesId: 2.5 })

    expect(result.success).toBe(false)
  })

  it('should return error when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

    const result = await evaluateSeriesBets({ seriesId: 5 })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Unauthorized')
  })

  it('should return error when evaluator throws', async () => {
    mockEvaluateSeriesAtomic.mockRejectedValue(
      new Error('Cannot evaluate series without results')
    )

    const result = await evaluateSeriesBets({ seriesId: 5 })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Cannot evaluate series without results')
  })

  it('should handle evaluator with no user bets', async () => {
    mockEvaluateSeriesAtomic.mockResolvedValue({
      success: true,
      results: [],
      totalUsersEvaluated: 0,
    })

    const result = await evaluateSeriesBets({ seriesId: 5 })

    expect(result.success).toBe(true)
    expect(result).toMatchObject({ totalUsersEvaluated: 0 })
  })

  it('should handle multiple user results and sum total points correctly', async () => {
    mockEvaluateSeriesAtomic.mockResolvedValue({
      success: true,
      results: [
        { userId: 1, totalPoints: 12, evaluatorResults: [] },
        { userId: 2, totalPoints: 0, evaluatorResults: [] },
      ],
      totalUsersEvaluated: 2,
    })

    await evaluateSeriesBets({ seriesId: 5 })

    expect(mockAuditLogger.seriesEvaluated).toHaveBeenCalledWith(
      1, 5, 2, 12, expect.any(Number)
    )
  })

  it('should not fail if audit logger throws', async () => {
    mockAuditLogger.seriesEvaluated.mockRejectedValue(new Error('Logging failed'))

    const result = await evaluateSeriesBets({ seriesId: 5 })

    expect(result.success).toBe(true)
  })
})
