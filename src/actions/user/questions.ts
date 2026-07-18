'use server'

import { prisma } from '@/lib/prisma'
import { isBettingOpen } from '@/lib/auth/user-auth-utils'
import { userQuestionBetSchema, type UserQuestionBetInput } from '@/lib/validation/user'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { saveUserBet, getFriendPredictions, type TransactionClient } from '@/lib/bet-utils'
import { createCachedEntityFetcher } from '@/lib/cached-data-utils'
import { nextMorningCutoff } from '@/lib/date-grouping-utils'

/**
 * Fetches questions for a league with the current user's answers
 */
export const getUserQuestions = createCachedEntityFetcher({
  cacheKey: 'question-data',
  cacheTags: ['question-data'],
  revalidateSeconds: 1200,
  fetchEntities: async (leagueId) => {
    const [questions, leagueMatches] = await Promise.all([
      prisma.leagueSpecialBetQuestion.findMany({
        where: { leagueId, deletedAt: null },
        include: { League: { select: { sportId: true } } },
        orderBy: { dateTime: 'asc' },
      }),
      prisma.leagueMatch.findMany({
        where: { leagueId, deletedAt: null, Match: { deletedAt: null } },
        select: {
          Match: {
            select: {
              dateTime: true,
              homePlaceholder: true,
              awayPlaceholder: true,
              MatchPhase: { select: { name: true } },
              LeagueTeam_Match_homeTeamIdToLeagueTeam: {
                select: {
                  group: true,
                  Team: { select: { name: true, shortcut: true, flagIcon: true, flagType: true } },
                },
              },
              LeagueTeam_Match_awayTeamIdToLeagueTeam: {
                select: {
                  Team: { select: { name: true, shortcut: true, flagIcon: true, flagType: true } },
                },
              },
            },
          },
        },
        orderBy: { Match: { dateTime: 'asc' } },
      }),
    ])

    // Compact, time-sorted match list shared across all questions.
    const matches = leagueMatches
      .map((lm) => lm.Match)
      .filter((m): m is NonNullable<typeof m> => m != null)
      .map((m) => ({
        dateTime: m.dateTime,
        // Playoff matches carry a MatchPhase; show its name instead of the group letter
        // (the group letter belongs to the team's group-stage assignment and is stale in playoffs).
        phase: m.MatchPhase?.name ?? null,
        group: m.LeagueTeam_Match_homeTeamIdToLeagueTeam?.group ?? null,
        home: m.LeagueTeam_Match_homeTeamIdToLeagueTeam?.Team ?? null,
        away: m.LeagueTeam_Match_awayTeamIdToLeagueTeam?.Team ?? null,
        homePlaceholder: m.homePlaceholder,
        awayPlaceholder: m.awayPlaceholder,
      }))

    // Attach each question's matches by game-day window. A game day is bounded above by
    // 08:00 the next morning (`nextMorningCutoff`): its deadline is the day's first
    // (afternoon) match, and the window captures that afternoon plus the following
    // night/early-morning games — exactly one hrací den. Because the upper bound is the
    // day's cutoff (not the *next question*), multiple questions on the same game day all
    // share that day's matches instead of only the last one getting them. Questions on the
    // same day share the same cutoff, so we start the window at the earliest such deadline.
    return questions.map((question) => {
      const end = nextMorningCutoff(new Date(question.dateTime))
      const start = Math.min(
        ...questions
          .filter((q) => nextMorningCutoff(new Date(q.dateTime)) === end)
          .map((q) => new Date(q.dateTime).getTime())
      )
      const dayMatches = matches
        .filter((m) => {
          const t = new Date(m.dateTime).getTime()
          return t >= start && t < end
        })
        .map(({ phase, group, home, away, homePlaceholder, awayPlaceholder }) => ({
          phase,
          group,
          home,
          away,
          homePlaceholder,
          awayPlaceholder,
        }))
      return { ...question, matches: dayMatches }
    })
  },
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
          LeagueUser: { active: true },
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
