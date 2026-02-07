'use server'

import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { AppError } from '@/lib/error-handler'
import {
  createQuestionSchema,
  updateQuestionSchema,
  updateQuestionResultSchema,
  type CreateQuestionInput,
  type UpdateQuestionInput,
  type UpdateQuestionResultInput,
} from '@/lib/validation/admin'
import { deleteByIdSchema } from '@/lib/validation/admin'

/**
 * Create a new question in a league
 */
export async function createQuestion(input: CreateQuestionInput) {
  return executeServerAction(input, {
    validator: createQuestionSchema,
    handler: async (validated) => {
      const now = new Date()

      // Verify league exists
      const league = await prisma.league.findFirst({
        where: {
          id: validated.leagueId,
          deletedAt: null,
        },
      })

      if (!league) {
        throw new AppError('League not found', 'NOT_FOUND', 404)
      }

      // Create the question
      const question = await prisma.leagueSpecialBetQuestion.create({
        data: {
          leagueId: validated.leagueId,
          text: validated.text,
          dateTime: validated.dateTime,
          createdAt: now,
          updatedAt: now,
        },
      })

      // Invalidate user-facing question cache
      revalidateTag('question-data', 'max')

      return { questionId: question.id }
    },
    revalidatePath: '/admin/questions',
    requiresAdmin: true,
  })
}

/**
 * Update question text and/or dateTime
 */
export async function updateQuestion(input: UpdateQuestionInput) {
  return executeServerAction(input, {
    validator: updateQuestionSchema,
    handler: async (validated) => {
      const now = new Date()

      // Verify question exists
      const question = await prisma.leagueSpecialBetQuestion.findUnique({
        where: { id: validated.id, deletedAt: null },
      })

      if (!question) {
        throw new AppError('Question not found', 'NOT_FOUND', 404)
      }

      // Update the question with provided fields
      await prisma.leagueSpecialBetQuestion.update({
        where: { id: validated.id },
        data: {
          ...(validated.text !== undefined && { text: validated.text }),
          ...(validated.dateTime !== undefined && { dateTime: validated.dateTime }),
          updatedAt: now,
        },
      })

      // Invalidate user-facing question cache
      revalidateTag('question-data', 'max')

      return {}
    },
    revalidatePath: '/admin/questions',
    requiresAdmin: true,
  })
}

/**
 * Update question result (answer: yes/no)
 */
export async function updateQuestionResult(input: UpdateQuestionResultInput) {
  return executeServerAction(input, {
    validator: updateQuestionResultSchema,
    handler: async (validated) => {
      const now = new Date()

      // Verify question exists
      const question = await prisma.leagueSpecialBetQuestion.findUnique({
        where: { id: validated.questionId, deletedAt: null },
      })

      if (!question) {
        throw new AppError('Question not found', 'NOT_FOUND', 404)
      }

      // Update the question result
      await prisma.leagueSpecialBetQuestion.update({
        where: { id: validated.questionId },
        data: {
          result: validated.result,
          updatedAt: now,
        },
      })

      // Invalidate user-facing question cache
      revalidateTag('question-data', 'max')

      return {}
    },
    revalidatePath: '/admin/questions',
    requiresAdmin: true,
  })
}

/**
 * Delete a question (soft delete)
 */
export async function deleteQuestion(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      // Verify question exists
      const question = await prisma.leagueSpecialBetQuestion.findUnique({
        where: { id: validated.id, deletedAt: null },
      })

      if (!question) {
        throw new AppError('Question not found', 'NOT_FOUND', 404)
      }

      // Soft delete by setting deletedAt
      await prisma.leagueSpecialBetQuestion.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      // Invalidate user-facing question cache
      revalidateTag('question-data', 'max')

      return {}
    },
    revalidatePath: '/admin/questions',
    requiresAdmin: true,
  })
}