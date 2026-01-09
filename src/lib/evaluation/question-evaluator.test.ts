import { describe, it, expect, beforeEach, vi } from 'vitest'
import { evaluateQuestionAtomic } from './question-evaluator'
import { prisma } from '@/lib/prisma'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

describe('Question Evaluator', () => {
  const mockTx = {
    leagueSpecialBetQuestion: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    userSpecialBetQuestion: {
      update: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock $transaction to execute the callback immediately with mockTx
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return await callback(mockTx)
    })
  })

  describe('Scoring Logic', () => {
    it('should award full points for correct answer', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: true, // Correct
            LeagueUser: { userId: 1 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      const result = await evaluateQuestionAtomic({ questionId: 1 })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].pointsAwarded).toBe(10)
      expect(result.results[0].isCorrect).toBe(true)

      // Verify the update was called with correct points
      expect(mockTx.userSpecialBetQuestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            totalPoints: 10,
          }),
        })
      )
    })

    it('should award negative half points for wrong answer', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: false, // Wrong
            LeagueUser: { userId: 1 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      const result = await evaluateQuestionAtomic({ questionId: 1 })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].pointsAwarded).toBe(-5) // 10 / 2 * -1
      expect(result.results[0].isCorrect).toBe(false)

      // Verify the update was called with correct negative points
      expect(mockTx.userSpecialBetQuestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            totalPoints: -5,
          }),
        })
      )
    })

    it('should award zero points for no bet (null userBet)', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: null, // No bet
            LeagueUser: { userId: 1 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      const result = await evaluateQuestionAtomic({ questionId: 1 })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].pointsAwarded).toBe(0)
      expect(result.results[0].isCorrect).toBe(null)

      // Verify the update was called with zero points
      expect(mockTx.userSpecialBetQuestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            totalPoints: 0,
          }),
        })
      )
    })

    it('should handle odd points correctly (divide by 2 rounds down)', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '15', // Odd number
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: false, // Wrong
            LeagueUser: { userId: 1 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      const result = await evaluateQuestionAtomic({ questionId: 1 })

      expect(result.results[0].pointsAwarded).toBe(-7) // Math.floor(15 / 2) * -1 = -7
    })
  })

  describe('Multiple Users', () => {
    it('should evaluate multiple users with mixed results', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: true, // Correct
            LeagueUser: { userId: 1 },
          },
          {
            id: 2,
            userBet: false, // Wrong
            LeagueUser: { userId: 2 },
          },
          {
            id: 3,
            userBet: null, // No bet
            LeagueUser: { userId: 3 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      const result = await evaluateQuestionAtomic({ questionId: 1 })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(3)
      expect(result.totalUsersEvaluated).toBe(3)

      // User 1: Correct
      expect(result.results[0].userId).toBe(1)
      expect(result.results[0].pointsAwarded).toBe(10)
      expect(result.results[0].isCorrect).toBe(true)

      // User 2: Wrong
      expect(result.results[1].userId).toBe(2)
      expect(result.results[1].pointsAwarded).toBe(-5)
      expect(result.results[1].isCorrect).toBe(false)

      // User 3: No bet
      expect(result.results[2].userId).toBe(3)
      expect(result.results[2].pointsAwarded).toBe(0)
      expect(result.results[2].isCorrect).toBe(null)

      // Verify all updates were called
      expect(mockTx.userSpecialBetQuestion.update).toHaveBeenCalledTimes(3)
    })
  })

  describe('Question Marked as Evaluated', () => {
    it('should mark question as evaluated after full evaluation', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: true,
            LeagueUser: { userId: 1 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.leagueSpecialBetQuestion.update.mockResolvedValue({})
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      await evaluateQuestionAtomic({ questionId: 1 })

      // Verify question was marked as evaluated
      expect(mockTx.leagueSpecialBetQuestion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            isEvaluated: true,
          }),
        })
      )
    })

    it('should NOT mark question as evaluated when evaluating single user', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: true,
            LeagueUser: { userId: 1 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      await evaluateQuestionAtomic({ questionId: 1, userId: 1 })

      // Verify question was NOT marked as evaluated
      expect(mockTx.leagueSpecialBetQuestion.update).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should throw error if question has no result', async () => {
      const mockQuestion = {
        id: 1,
        result: null, // No result set
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)

      await expect(evaluateQuestionAtomic({ questionId: 1 })).rejects.toThrow(
        'Question result must be set before evaluation'
      )
    })

    it('should throw error if no evaluator configured', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [], // No evaluator
        },
        UserSpecialBetQuestion: [],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)

      await expect(evaluateQuestionAtomic({ questionId: 1 })).rejects.toThrow(
        'No question evaluator configured for this league'
      )
    })
  })

  describe('Transaction Isolation', () => {
    it('should execute evaluation in a transaction with Serializable isolation', async () => {
      const mockQuestion = {
        id: 1,
        result: true,
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)

      await evaluateQuestionAtomic({ questionId: 1 })

      // Verify transaction was called with correct isolation level
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      )
    })
  })

  describe('Result Variants', () => {
    it('should correctly evaluate when correct answer is "No" (false)', async () => {
      const mockQuestion = {
        id: 1,
        result: false, // Correct answer is "No"
        League: {
          Evaluator: [
            {
              points: '10',
              EvaluatorType: { name: 'question' },
            },
          ],
        },
        UserSpecialBetQuestion: [
          {
            id: 1,
            userBet: false, // Correct (answered "No")
            LeagueUser: { userId: 1 },
          },
          {
            id: 2,
            userBet: true, // Wrong (answered "Yes")
            LeagueUser: { userId: 2 },
          },
        ],
      }

      mockTx.leagueSpecialBetQuestion.findUniqueOrThrow.mockResolvedValue(mockQuestion)
      mockTx.userSpecialBetQuestion.update.mockResolvedValue({})

      const result = await evaluateQuestionAtomic({ questionId: 1 })

      // User 1: Correct (answered No, correct is No)
      expect(result.results[0].pointsAwarded).toBe(10)
      expect(result.results[0].isCorrect).toBe(true)

      // User 2: Wrong (answered Yes, correct is No)
      expect(result.results[1].pointsAwarded).toBe(-5)
      expect(result.results[1].isCorrect).toBe(false)
    })
  })
})
