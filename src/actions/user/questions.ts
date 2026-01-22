'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/user-auth-utils'
import { userQuestionBetSchema, type UserQuestionBetInput } from '@/lib/validation/user'

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
 */
export async function saveQuestionBet(input: UserQuestionBetInput) {
  const parsed = userQuestionBetSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  const question = await prisma.leagueSpecialBetQuestion.findUnique({
    where: { id: validated.leagueSpecialBetQuestionId, deletedAt: null },
  })

  if (!question) {
    return { success: false, error: 'Question not found' }
  }

  const { leagueUser } = await requireLeagueMember(question.leagueId)

  if (!isBettingOpen(question.dateTime)) {
    return { success: false, error: 'Betting is closed for this question' }
  }

  // Atomic upsert to prevent race conditions
  const now = new Date()

  await prisma.userSpecialBetQuestion.upsert({
    where: {
      leagueSpecialBetQuestionId_leagueUserId_deletedAt: {
        leagueSpecialBetQuestionId: validated.leagueSpecialBetQuestionId,
        leagueUserId: leagueUser.id,
        deletedAt: null as any,
      },
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

  revalidatePath(`/${question.leagueId}/questions`)

  return { success: true }
}
