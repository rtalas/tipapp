'use server'

import { prisma } from '@/lib/prisma'
import { isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userQuestionBetSchema, type UserQuestionBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { saveUserBet, getFriendPredictions, type TransactionClient } from '@/lib/bet-utils'
import { createCachedEntityFetcher } from '@/lib/cached-data-utils'

/**
 * Fetches questions for a league with the current user's answers
 */
export const getUserQuestions = createCachedEntityFetcher({
  cacheKey: 'question-data',
  cacheTags: ['question-data'],
  revalidateSeconds: 1200,
  fetchEntities: (leagueId) =>
    prisma.leagueSpecialBetQuestion.findMany({
      where: { leagueId, deletedAt: null },
      orderBy: { dateTime: 'asc' },
    }),
  fetchUserBets: (leagueUserId, leagueId) =>
    prisma.userSpecialBetQuestion.findMany({
      where: {
        leagueUserId,
        deletedAt: null,
        LeagueSpecialBetQuestion: { leagueId, deletedAt: null },
      },
    }),
  getUserBetEntityId: (bet) => bet.leagueSpecialBetQuestionId,
  getDateTime: (question) => question.dateTime,
})

export type UserQuestion = Awaited<ReturnType<typeof getUserQuestions>>[number]

/**
 * Fetches friend predictions for a specific question
 * Only returns predictions if the betting is closed
 */
export async function getQuestionFriendPredictions(leagueSpecialBetQuestionId: number) {
  return getFriendPredictions({
    entityId: leagueSpecialBetQuestionId,
    entityLabel: 'Question',
    findEntity: (id) =>
      prisma.leagueSpecialBetQuestion.findUnique({
        where: { id, deletedAt: null },
      }),
    getLeagueId: (question) => question.leagueId,
    getDateTime: (question) => question.dateTime,
    findPredictions: (entityId, excludeLeagueUserId) =>
      prisma.userSpecialBetQuestion.findMany({
        where: {
          leagueSpecialBetQuestionId: entityId,
          deletedAt: null,
          leagueUserId: { not: excludeLeagueUserId },
        },
        include: {
          LeagueUser: {
            include: {
              User: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { totalPoints: 'desc' },
      }),
  })
}

export type QuestionFriendPrediction = Awaited<
  ReturnType<typeof getQuestionFriendPredictions>
>['predictions'][number]

/**
 * Creates or updates a question answer for the current user
 * Uses Serializable transaction for data consistency
 */
export async function saveQuestionBet(input: UserQuestionBetInput) {
  return saveUserBet({
    input,
    schema: userQuestionBetSchema,
    entityLabel: 'Question',
    findLeagueId: async (validated) => {
      const info = await prisma.leagueSpecialBetQuestion.findUnique({
        where: { id: validated.leagueSpecialBetQuestionId, deletedAt: null },
        select: { leagueId: true },
      })
      return info?.leagueId ?? null
    },
    runTransaction: async (tx: TransactionClient, validated, leagueUserId) => {
      const question = await tx.leagueSpecialBetQuestion.findUnique({
        where: { id: validated.leagueSpecialBetQuestionId, deletedAt: null },
      })

      if (!question) {
        throw new AppError('Question not found', 'NOT_FOUND', 404)
      }

      if (!isBettingOpen(question.dateTime)) {
        throw new AppError('Betting is closed for this question', 'BETTING_CLOSED', 400)
      }

      const existingBet = await tx.userSpecialBetQuestion.findFirst({
        where: {
          leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
          leagueUserId,
          deletedAt: null,
        },
      })

      const now = new Date()

      if (existingBet) {
        await tx.userSpecialBetQuestion.update({
          where: { id: existingBet.id },
          data: {
            userBet: validated.userBet,
            updatedAt: now,
          },
        })
        return true
      }

      await tx.userSpecialBetQuestion.create({
        data: {
          leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
          leagueUserId,
          userBet: validated.userBet,
          totalPoints: 0,
          dateTime: now,
          createdAt: now,
          updatedAt: now,
        },
      })
      return false
    },
    audit: {
      getEntityId: (validated) => validated.leagueSpecialBetQuestionId,
      getMetadata: (validated) => ({
        userBet: validated.userBet,
      }),
      onCreated: AuditLogger.questionBetCreated,
      onUpdated: AuditLogger.questionBetUpdated,
    },
    revalidatePathSuffix: '/questions',
  })
}
