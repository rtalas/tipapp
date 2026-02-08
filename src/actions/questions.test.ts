import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createQuestion, updateQuestion, updateQuestionResult, deleteQuestion } from './questions'
import { prisma } from '@/lib/prisma'
import { revalidateTag, revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidateTag = vi.mocked(revalidateTag)
const mockRevalidatePath = vi.mocked(revalidatePath)
const mockRequireAdmin = vi.mocked(requireAdmin)

describe('Questions Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createQuestion', () => {
    it('should create question when league exists', async () => {
      mockPrisma.league.findFirst.mockResolvedValue({ id: 1, name: 'League' } as any)
      mockPrisma.leagueSpecialBetQuestion.create.mockResolvedValue({ id: 10 } as any)

      const result = await createQuestion({
        leagueId: 1,
        text: 'Will team X win?',
        dateTime: new Date('2026-06-01'),
      })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect((result as any).questionId).toBe(10)
    })

    it('should return error when league not found', async () => {
      mockPrisma.league.findFirst.mockResolvedValue(null)

      const result = await createQuestion({
        leagueId: 999,
        text: 'Will team X win the tournament?',
        dateTime: new Date('2026-06-01'),
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('League not found')
    })

    it('should invalidate question-data cache', async () => {
      mockPrisma.league.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetQuestion.create.mockResolvedValue({ id: 1 } as any)

      await createQuestion({ leagueId: 1, text: 'Will there be overtime in game 1?', dateTime: new Date('2026-06-01') })

      expect(mockRevalidateTag).toHaveBeenCalledWith('question-data', 'max')
    })

    it('should revalidate admin path', async () => {
      mockPrisma.league.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetQuestion.create.mockResolvedValue({ id: 1 } as any)

      await createQuestion({ leagueId: 1, text: 'Will there be overtime in game 1?', dateTime: new Date('2026-06-01') })

      expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/questions')
    })
  })

  describe('updateQuestion', () => {
    it('should update question when it exists', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetQuestion.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateQuestion({ id: 1, text: 'Updated question text here?' })

      expect(result.success).toBe(true)
      expect(mockRevalidateTag).toHaveBeenCalledWith('question-data', 'max')
    })

    it('should return error when question not found', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue(null)

      const result = await updateQuestion({ id: 999, text: 'Some question that is long enough?' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Question not found')
    })
  })

  describe('updateQuestionResult', () => {
    it('should update question result', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetQuestion.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateQuestionResult({ questionId: 1, result: true })

      expect(result.success).toBe(true)
    })

    it('should return error when question not found', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue(null)

      const result = await updateQuestionResult({ questionId: 999, result: false })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Question not found')
    })

    it('should invalidate cache on result update', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetQuestion.update.mockResolvedValue({ id: 1 } as any)

      await updateQuestionResult({ questionId: 1, result: true })

      expect(mockRevalidateTag).toHaveBeenCalledWith('question-data', 'max')
    })
  })

  describe('deleteQuestion', () => {
    it('should soft delete question', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetQuestion.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteQuestion(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueSpecialBetQuestion.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should return error when question not found', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue(null)

      const result = await deleteQuestion(999)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Question not found')
    })

    it('should invalidate cache on delete', async () => {
      mockPrisma.leagueSpecialBetQuestion.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetQuestion.update.mockResolvedValue({ id: 1 } as any)

      await deleteQuestion(1)

      expect(mockRevalidateTag).toHaveBeenCalledWith('question-data', 'max')
    })
  })
})
