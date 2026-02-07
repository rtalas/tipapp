import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateQuestionBets } from './evaluate-questions'
import * as authUtils from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { revalidateTag, revalidatePath } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/evaluation/question-evaluator', () => ({
  evaluateQuestionAtomic: vi.fn(),
}))

import { evaluateQuestionAtomic } from '@/lib/evaluation/question-evaluator'

const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)
const mockEvaluateQuestionAtomic = vi.mocked(evaluateQuestionAtomic)
const mockRevalidateTag = vi.mocked(revalidateTag)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockAuditLogger = vi.mocked(AuditLogger)

const adminSession = { user: { id: '1', isSuperadmin: true } } as any

const evaluatorResult = {
  success: true,
  results: [
    {
      userId: 10,
      betId: 50,
      pointsAwarded: 6,
      isCorrect: true,
    },
    {
      userId: 11,
      betId: 51,
      pointsAwarded: -3,
      isCorrect: false,
    },
  ],
  totalUsersEvaluated: 2,
}

describe('evaluateQuestionBets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(adminSession)
    mockEvaluateQuestionAtomic.mockResolvedValue(evaluatorResult)
    mockAuditLogger.questionEvaluated.mockResolvedValue(undefined as any)
  })

  it('should return success and delegate to evaluateQuestionAtomic', async () => {
    const result = await evaluateQuestionBets({ questionId: 3 })

    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result).toMatchObject({
      results: evaluatorResult.results,
      totalUsersEvaluated: 2,
    })
    expect(mockEvaluateQuestionAtomic).toHaveBeenCalledWith({
      questionId: 3,
      userId: undefined,
    })
  })

  it('should pass userId to evaluator when provided', async () => {
    await evaluateQuestionBets({ questionId: 3, userId: 42 })

    expect(mockEvaluateQuestionAtomic).toHaveBeenCalledWith({
      questionId: 3,
      userId: 42,
    })
  })

  it('should invalidate question-data and leaderboard caches', async () => {
    await evaluateQuestionBets({ questionId: 3 })

    expect(mockRevalidateTag).toHaveBeenCalledWith('question-data', 'max')
    expect(mockRevalidateTag).toHaveBeenCalledWith('leaderboard', 'max')
  })

  it('should revalidate admin path', async () => {
    await evaluateQuestionBets({ questionId: 3 })

    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('should call AuditLogger.questionEvaluated with correct params', async () => {
    await evaluateQuestionBets({ questionId: 3 })

    // Question uses pointsAwarded (not totalPoints) for sum
    // Total: 6 + (-3) = 3
    expect(mockAuditLogger.questionEvaluated).toHaveBeenCalledWith(
      1, // Number(session.user.id)
      3, // questionId
      2, // totalUsersEvaluated
      3, // totalPoints (6 + -3)
      expect.any(Number) // durationMs
    )
  })

  it('should return error for invalid questionId', async () => {
    const result = await evaluateQuestionBets({ questionId: -1 })

    expect(result.success).toBe(false)
    expect(mockEvaluateQuestionAtomic).not.toHaveBeenCalled()
  })

  it('should return error for zero questionId', async () => {
    const result = await evaluateQuestionBets({ questionId: 0 })

    expect(result.success).toBe(false)
  })

  it('should return error for non-integer questionId', async () => {
    const result = await evaluateQuestionBets({ questionId: 1.5 })

    expect(result.success).toBe(false)
  })

  it('should return error when not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized: Admin access required'))

    const result = await evaluateQuestionBets({ questionId: 3 })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Unauthorized')
  })

  it('should return error when evaluator throws', async () => {
    mockEvaluateQuestionAtomic.mockRejectedValue(
      new Error('Question result must be set before evaluation')
    )

    const result = await evaluateQuestionBets({ questionId: 3 })

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Question result must be set before evaluation')
  })

  it('should handle evaluator with no user bets', async () => {
    mockEvaluateQuestionAtomic.mockResolvedValue({
      success: true,
      results: [],
      totalUsersEvaluated: 0,
    })

    const result = await evaluateQuestionBets({ questionId: 3 })

    expect(result.success).toBe(true)
    expect(result).toMatchObject({ totalUsersEvaluated: 0 })
  })

  it('should correctly sum negative points from wrong answers', async () => {
    mockEvaluateQuestionAtomic.mockResolvedValue({
      success: true,
      results: [
        { userId: 1, betId: 1, pointsAwarded: -3, isCorrect: false },
        { userId: 2, betId: 2, pointsAwarded: -3, isCorrect: false },
        { userId: 3, betId: 3, pointsAwarded: 6, isCorrect: true },
      ],
      totalUsersEvaluated: 3,
    })

    await evaluateQuestionBets({ questionId: 3 })

    // Total: -3 + -3 + 6 = 0
    expect(mockAuditLogger.questionEvaluated).toHaveBeenCalledWith(
      1, 3, 3, 0, expect.any(Number)
    )
  })

  it('should not fail if audit logger throws', async () => {
    mockAuditLogger.questionEvaluated.mockRejectedValue(new Error('Logging failed'))

    const result = await evaluateQuestionBets({ questionId: 3 })

    expect(result.success).toBe(true)
  })
})
