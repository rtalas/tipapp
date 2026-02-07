'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userQuestionBetSchema, type UserQuestionBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'

/**
 * Cached base question data (20 min TTL)
 * Shared across all users - excludes user-specific bets
 */
const getCachedQuestionData = unstable_cache(
  async (leagueId: number) => {
    const questions = await prisma.leagueSpecialBetQuestion.findMany({
      where: {
        leagueId,
        deletedAt: null,
      },
      orderBy: { dateTime: 'asc' },
    })

    return questions
  },
  ['question-data'],
  {
    revalidate: 1200, // 20 minutes
    tags: ['question-data'],
  }
)

/**
 * Fetches questions for a league with the current user's answers
 */
export async function getUserQuestions(leagueId: number) {
  const { leagueUser } = await requireLeagueMember(leagueId)

  // Fetch cached base data and user's bets in parallel
  const [questions, userBets] = await Promise.all([
    getCachedQuestionData(leagueId),
    prisma.userSpecialBetQuestion.findMany({
      where: {
        leagueUserId: leagueUser.id,
        deletedAt: null,
        LeagueSpecialBetQuestion: {
          leagueId,
          deletedAt: null,
        },
      },
    }),
  ])

  // Create a map of user bets by leagueSpecialBetQuestionId for fast lookup
  const userBetMap = new Map(userBets.map((bet) => [bet.leagueSpecialBetQuestionId, bet]))

  // Transform the data to include betting status and user's bet
  return questions.map((q) => ({
    ...q,
    isBettingOpen: isBettingOpen(q.dateTime),
    userBet: userBetMap.get(q.id) || null,
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
    throw new AppError('Question not found', 'NOT_FOUND', 404)
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
              avatarUrl: true,
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
        const existingBet = await tx.userSpecialBetQuestion.findFirst({
          where: {
            leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
            leagueUserId: leagueUser.id,
            deletedAt: null,
          },
        })

        isUpdate = !!existingBet

        const now = new Date()

        if (existingBet) {
          // Update existing bet
          await tx.userSpecialBetQuestion.update({
            where: { id: existingBet.id },
            data: {
              userBet: validated.userBet,
              updatedAt: now,
            },
          })
        } else {
          // Create new bet
          await tx.userSpecialBetQuestion.create({
            data: {
              leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
              leagueUserId: leagueUser.id,
              userBet: validated.userBet,
              totalPoints: 0,
              dateTime: now,
              createdAt: now,
              updatedAt: now,
            },
          })
        }
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

    revalidateTag('bet-badges', 'max')
    revalidatePath(`/${questionInfo.leagueId}/questions`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }
    throw error
  }
}
