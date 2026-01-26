'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userQuestionBetSchema, type UserQuestionBetInput } from '@/lib/validation/user'
import { nullableUniqueConstraint } from '@/lib/prisma-utils'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/audit-logger'

/**
 * Fetches questions for a league with the current user's answers
 */
export async function getUserQuestions(leagueId: number) {
  const { leagueUser } = await requireLeagueMember(leagueId)

  const questions = await prisma.leagueSpecialBetQuestion.findMany({
    where: {
      leagueId,
      deletedAt: null,
    },
    include: {
      UserSpecialBetQuestion: {
        where: {
          leagueUserId: leagueUser.id,
          deletedAt: null,
        },
        take: 1,
      },
    },
    orderBy: { dateTime: 'asc' },
  })

  return questions.map((q) => ({
    ...q,
    isBettingOpen: isBettingOpen(q.dateTime),
    userBet: q.UserSpecialBetQuestion[0] || null,
  }))
}

export type UserQuestion = Awaited<ReturnType<typeof getUserQuestions>>[number]

/**
 * Fetches friend predictions for a specific question
 * Only returns predictions if the betting is closed
 */
export async function getQuestionFriendPredictions(leagueSpecialBetQuestionId: number) {
  const question = await prisma.leagueSpecialBetQuestion.findUnique({
    where: { id: leagueSpecialBetQuestionId, deletedAt: null },
  })

  if (!question) {
    throw new Error('Question not found')
  }

  const { leagueUser } = await requireLeagueMember(question.leagueId)

  // Only show friend predictions after betting is closed
  if (isBettingOpen(question.dateTime)) {
    return {
      isLocked: false,
      predictions: [],
    }
  }

  const predictions = await prisma.userSpecialBetQuestion.findMany({
    where: {
      leagueSpecialBetQuestionId,
      deletedAt: null,
      leagueUserId: { not: leagueUser.id },
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
            },
          },
        },
      },
    },
    orderBy: { totalPoints: 'desc' },
  })

  return {
    isLocked: true,
    predictions,
  }
}

export type QuestionFriendPrediction = Awaited<
  ReturnType<typeof getQuestionFriendPredictions>
>['predictions'][number]

/**
 * Creates or updates a question answer for the current user
 * Uses Serializable transaction for data consistency
 */
export async function saveQuestionBet(input: UserQuestionBetInput) {
  const startTime = Date.now()
  const parsed = userQuestionBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  // Get question leagueId for membership check (outside transaction)
  const questionInfo = await prisma.leagueSpecialBetQuestion.findUnique({
    where: { id: validated.leagueSpecialBetQuestionId, deletedAt: null },
    select: { leagueId: true },
  })

  if (!questionInfo) {
    return { success: false, error: 'Question not found' }
  }

  // Verify league membership (outside transaction)
  const { leagueUser } = await requireLeagueMember(questionInfo.leagueId)

  // Wrap database operations in Serializable transaction
  try {
    let isUpdate = false

    await prisma.$transaction(
      async (tx) => {
        // Fetch question details within transaction for consistency
        const question = await tx.leagueSpecialBetQuestion.findUnique({
          where: { id: validated.leagueSpecialBetQuestionId, deletedAt: null },
        })

        if (!question) {
          throw new AppError('Question not found', 'NOT_FOUND', 404)
        }

        // Check betting lock
        if (!isBettingOpen(question.dateTime)) {
          throw new AppError(
            'Betting is closed for this question',
            'BETTING_CLOSED',
            400
          )
        }

        // Check if bet exists to determine action type
        const existingBet = await tx.userSpecialBetQuestion.findUnique({
          where: {
            leagueSpecialBetQuestionId_leagueUserId_deletedAt:
              nullableUniqueConstraint({
                leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
                leagueUserId: leagueUser.id,
                deletedAt: null,
              }),
          },
        })

        isUpdate = !!existingBet

        // Atomic upsert to prevent race conditions
        const now = new Date()

        await tx.userSpecialBetQuestion.upsert({
          where: {
            leagueSpecialBetQuestionId_leagueUserId_deletedAt:
              nullableUniqueConstraint({
                leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
                leagueUserId: leagueUser.id,
                deletedAt: null,
              }),
          },
          update: {
            userBet: validated.userBet,
            updatedAt: now,
          },
          create: {
            leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
            leagueUserId: leagueUser.id,
            userBet: validated.userBet,
            totalPoints: 0,
            dateTime: now,
            createdAt: now,
            updatedAt: now,
          },
        })
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000, // 5s max wait for lock
        timeout: 10000, // 10s max transaction time
      }
    )

    // Audit log (fire-and-forget)
    const durationMs = Date.now() - startTime
    const metadata = {
      userBet: validated.userBet,
    }

    if (isUpdate) {
      AuditLogger.questionBetUpdated(
        leagueUser.userId,
        questionInfo.leagueId,
        validated.leagueSpecialBetQuestionId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    } else {
      AuditLogger.questionBetCreated(
        leagueUser.userId,
        questionInfo.leagueId,
        validated.leagueSpecialBetQuestionId,
        metadata,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))
    }

    revalidatePath(`/${questionInfo.leagueId}/questions`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }
    throw error
  }
}
