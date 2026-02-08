'use server'

import { requireAdmin } from '@/lib/auth/auth-utils'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildQuestionPicksWhere } from '@/lib/query-builders'
import { AppError } from '@/lib/error-handler'
import {
  createUserQuestionBetSchema,
  updateUserQuestionBetSchema,
  type CreateUserQuestionBetInput,
  type UpdateUserQuestionBetInput,
} from '@/lib/validation/admin'
import { deleteByIdSchema } from '@/lib/validation/admin'

/**
 * Get all questions with user bets (for admin page)
 * This is the main query for the merged admin interface
 */
export async function getQuestionsWithUserBets(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}) {
  await requireAdmin()

  const whereConditions = buildQuestionPicksWhere(filters)

  const questions = await prisma.leagueSpecialBetQuestion.findMany({
    where: whereConditions,
    include: {
      League: true,
      UserSpecialBetQuestion: {
        where: { deletedAt: null },
        include: {
          LeagueUser: {
            include: {
              User: true,
            },
          },
        },
        orderBy: [
          { LeagueUser: { User: { lastName: 'asc' } } },
          { LeagueUser: { User: { firstName: 'asc' } } },
        ],
      },
    },
    orderBy: { dateTime: 'desc' },
  })

  return questions
}

// Export types for components
export type QuestionWithUserBets = Awaited<ReturnType<typeof getQuestionsWithUserBets>>[number]
export type UserQuestionBet = QuestionWithUserBets['UserSpecialBetQuestion'][number]

/**
 * Create a new user question bet
 */
export async function createUserQuestionBet(input: CreateUserQuestionBetInput) {
  return executeServerAction(input, {
    validator: createUserQuestionBetSchema,
    handler: async (validated) => {
      const now = new Date()

      // Use transaction to prevent race condition in duplicate check
      const bet = await prisma.$transaction(async (tx) => {
        // Verify question exists and check betting deadline
        const question = await tx.leagueSpecialBetQuestion.findUnique({
          where: { id: validated.leagueSpecialBetQuestionId, deletedAt: null },
        })

        if (!question) {
          throw new AppError('Question not found', 'NOT_FOUND', 404)
        }

        // Verify leagueUser exists
        const leagueUser = await tx.leagueUser.findUnique({
          where: { id: validated.leagueUserId, deletedAt: null },
        })

        if (!leagueUser) {
          throw new AppError('League user not found', 'NOT_FOUND', 404)
        }

        // Verify leagueUser belongs to the same league as the question
        if (leagueUser.leagueId !== question.leagueId) {
          throw new AppError('User does not belong to the same league as this question', 'BAD_REQUEST', 400)
        }

        // Check for duplicate bet (same user + question)
        const existingBet = await tx.userSpecialBetQuestion.findFirst({
          where: {
            leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
            leagueUserId: validated.leagueUserId,
            deletedAt: null,
          },
        })

        if (existingBet) {
          throw new AppError('User already has a bet for this question', 'CONFLICT', 409)
        }

        // Create the bet
        return await tx.userSpecialBetQuestion.create({
          data: {
            leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
            leagueUserId: validated.leagueUserId,
            userBet: validated.userBet,
            dateTime: now,
            totalPoints: 0,
            createdAt: now,
            updatedAt: now,
          },
        })
      })

      return { betId: bet.id }
    },
    revalidatePath: '/admin/questions',
    requiresAdmin: true,
  })
}

/**
 * Update user question bet
 */
export async function updateUserQuestionBet(input: UpdateUserQuestionBetInput) {
  return executeServerAction(input, {
    validator: updateUserQuestionBetSchema,
    handler: async (validated) => {
      const now = new Date()

      // Verify bet exists and check betting deadline
      const bet = await prisma.userSpecialBetQuestion.findUnique({
        where: { id: validated.id, deletedAt: null },
        include: {
          LeagueSpecialBetQuestion: true,
        },
      })

      if (!bet) {
        throw new AppError('User bet not found', 'NOT_FOUND', 404)
      }

      await prisma.userSpecialBetQuestion.update({
        where: { id: validated.id },
        data: {
          ...(validated.userBet !== undefined && { userBet: validated.userBet }),
          updatedAt: now,
        },
      })

      return {}
    },
    revalidatePath: '/admin/questions',
    requiresAdmin: true,
  })
}

/**
 * Delete user question bet (soft delete)
 */
export async function deleteUserQuestionBet(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated) => {
      // Verify bet exists
      const bet = await prisma.userSpecialBetQuestion.findUnique({
        where: { id: validated.id, deletedAt: null },
      })

      if (!bet) {
        throw new AppError('User bet not found', 'NOT_FOUND', 404)
      }

      await prisma.userSpecialBetQuestion.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      return {}
    },
    revalidatePath: '/admin/questions',
    requiresAdmin: true,
  })
}
