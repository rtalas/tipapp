import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getQuestionsWithUserBets,
  createUserQuestionBet,
  updateUserQuestionBet,
  deleteUserQuestionBet,
} from './question-bets'
import { prisma } from '@/lib/prisma'
import * as authUtils from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/query-builders', () => ({
  buildQuestionPicksWhere: vi.fn().mockReturnValue({}),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)

describe('Question Bets Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
  })

  describe('getQuestionsWithUserBets', () => {
    it('should return questions with user bets', async () => {
      mockPrisma.leagueSpecialBetQuestion.findMany.mockResolvedValue([{ id: 1 }] as any)

      const result = await getQuestionsWithUserBets({ leagueId: 1 })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getQuestionsWithUserBets()).rejects.toThrow('Unauthorized')
    })
  })

  describe('createUserQuestionBet', () => {
    it('should create question bet in transaction', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
          leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
          userSpecialBetQuestion: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 100 }),
          },
        }
        return fn(tx)
      })

      const result = await createUserQuestionBet({
        leagueSpecialBetQuestionId: 1,
        leagueUserId: 5,
        userBet: true,
      })

      expect(result.success).toBe(true)
      expect((result as any).betId).toBe(100)
    })

    it('should reject duplicate bet', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
          leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 1 }) },
          userSpecialBetQuestion: {
            findFirst: vi.fn().mockResolvedValue({ id: 99 }),
          },
        }
        return fn(tx)
      })

      const result = await createUserQuestionBet({
        leagueSpecialBetQuestionId: 1,
        leagueUserId: 5,
        userBet: false,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already has a bet')
    })

    it('should reject cross-league bet creation', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue({ id: 1, leagueId: 1 }) },
          leagueUser: { findUnique: vi.fn().mockResolvedValue({ id: 5, leagueId: 2 }) },
          userSpecialBetQuestion: { findFirst: vi.fn() },
        }
        return fn(tx)
      })

      const result = await createUserQuestionBet({
        leagueSpecialBetQuestionId: 1,
        leagueUserId: 5,
        userBet: true,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('does not belong to the same league')
    })

    it('should reject when question not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueSpecialBetQuestion: { findUnique: vi.fn().mockResolvedValue(null) },
          leagueUser: { findUnique: vi.fn() },
          userSpecialBetQuestion: { findFirst: vi.fn() },
        }
        return fn(tx)
      })

      const result = await createUserQuestionBet({
        leagueSpecialBetQuestionId: 999,
        leagueUserId: 5,
        userBet: true,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Question not found')
    })
  })

  describe('updateUserQuestionBet', () => {
    it('should update question bet', async () => {
      mockPrisma.userSpecialBetQuestion.findUnique.mockResolvedValue({
        id: 1,
        LeagueSpecialBetQuestion: { dateTime: new Date() },
      } as any)
      mockPrisma.userSpecialBetQuestion.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateUserQuestionBet({ id: 1, userBet: false })

      expect(result.success).toBe(true)
    })

    it('should return error when bet not found', async () => {
      mockPrisma.userSpecialBetQuestion.findUnique.mockResolvedValue(null)

      const result = await updateUserQuestionBet({ id: 999, userBet: true })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('not found')
    })
  })

  describe('deleteUserQuestionBet', () => {
    it('should soft delete question bet', async () => {
      mockPrisma.userSpecialBetQuestion.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.userSpecialBetQuestion.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteUserQuestionBet(1)

      expect(result.success).toBe(true)
    })

    it('should return error when bet not found', async () => {
      mockPrisma.userSpecialBetQuestion.findUnique.mockResolvedValue(null)

      const result = await deleteUserQuestionBet(999)

      expect(result.success).toBe(false)
    })
  })
})
