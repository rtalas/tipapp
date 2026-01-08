'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { buildSeriesWhere } from '@/lib/query-builders'
import { seriesInclude } from '@/lib/prisma-helpers'
import {
  createSeriesSchema,
  updateSeriesResultSchema,
  type CreateSeriesInput,
  type UpdateSeriesResultInput,
} from '@/lib/validation/admin'
import { deleteByIdSchema } from '@/lib/validation/admin'
import { evaluateSeriesExact, evaluateSeriesWinner } from '@/lib/evaluators'
import type { SeriesBetContext } from '@/lib/evaluators'

export async function createSeries(input: CreateSeriesInput) {
  await requireAdmin()

  const validated = createSeriesSchema.parse(input)
  const now = new Date()

  // Verify teams belong to the league
  const homeTeam = await prisma.leagueTeam.findFirst({
    where: {
      id: validated.homeTeamId,
      leagueId: validated.leagueId,
      deletedAt: null,
    },
  })

  const awayTeam = await prisma.leagueTeam.findFirst({
    where: {
      id: validated.awayTeamId,
      leagueId: validated.leagueId,
      deletedAt: null,
    },
  })

  if (!homeTeam || !awayTeam) {
    throw new Error('Teams must belong to the selected league')
  }

  // Create the series
  const series = await prisma.leagueSpecialBetSerie.create({
    data: {
      leagueId: validated.leagueId,
      specialBetSerieId: validated.specialBetSerieId,
      homeTeamId: validated.homeTeamId,
      awayTeamId: validated.awayTeamId,
      dateTime: validated.dateTime,
      createdAt: now,
      updatedAt: now,
    },
  })

  revalidatePath('/admin/series')
  return { success: true, seriesId: series.id }
}

export async function updateSeriesResult(input: UpdateSeriesResultInput) {
  await requireAdmin()

  const validated = updateSeriesResultSchema.parse(input)
  const now = new Date()

  // Update the series scores
  await prisma.leagueSpecialBetSerie.update({
    where: { id: validated.seriesId },
    data: {
      homeTeamScore: validated.homeTeamScore,
      awayTeamScore: validated.awayTeamScore,
      updatedAt: now,
    },
  })

  revalidatePath('/admin/series')
  return { success: true }
}

export async function deleteSeries(id: number) {
  await requireAdmin()

  const validated = deleteByIdSchema.parse({ id })

  // Soft delete by setting deletedAt
  await prisma.leagueSpecialBetSerie.update({
    where: { id: validated.id },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/series')
  return { success: true }
}

// Query functions
export async function getSeries(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
}) {
  const whereConditions = buildSeriesWhere(filters)

  return prisma.leagueSpecialBetSerie.findMany({
    where: whereConditions,
    include: seriesInclude,
    orderBy: { dateTime: 'desc' },
  })
}

export async function getSeriesById(seriesId: number) {
  return prisma.leagueSpecialBetSerie.findUnique({
    where: { id: seriesId, deletedAt: null },
    include: {
      League: true,
      LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
        include: { Team: true },
      },
      LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
        include: { Team: true },
      },
      UserSpecialBetSerie: {
        where: { deletedAt: null },
        include: {
          LeagueUser: {
            include: { User: true },
          },
        },
      },
    },
  })
}

export async function getLeaguesWithTeams() {
  return prisma.league.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    include: {
      LeagueTeam: {
        where: { deletedAt: null },
        include: { Team: true },
        orderBy: { Team: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Evaluate a single series and calculate points for all bets
// Uses atomic transaction to prevent race conditions (double evaluation)
export async function evaluateSeries(seriesId: number) {
  await requireAdmin()

  const now = new Date()

  // Wrapped in transaction with optimistic locking
  const result = await prisma.$transaction(async (tx) => {
    // Lock: Get series with exclusive lock within transaction
    const series = await tx.leagueSpecialBetSerie.findUnique({
      where: { id: seriesId, deletedAt: null },
      include: {
        League: {
          include: {
            Evaluator: {
              where: { deletedAt: null },
              include: { EvaluatorType: true },
            },
          },
        },
        UserSpecialBetSerie: {
          where: { deletedAt: null },
        },
      },
    })

    if (!series) {
      throw new Error('Series not found')
    }

    // Race condition protection: Check if already evaluated
    if (series.isEvaluated) {
      throw new Error('Series is already evaluated')
    }

    if (series.homeTeamScore === null || series.awayTeamScore === null) {
      throw new Error('Series scores must be entered before evaluation')
    }

    const evaluators = series.League.Evaluator

    // Build evaluator lookup by type name
    const evaluatorByType: Record<string, number> = {}
    for (const evaluator of evaluators) {
      evaluatorByType[evaluator.EvaluatorType.name] = parseInt(evaluator.points, 10) || 0
    }

    // Actual series results
    const actualHomeScore = series.homeTeamScore
    const actualAwayScore = series.awayTeamScore

    // Process each bet
    for (const bet of series.UserSpecialBetSerie) {
      let points = 0

      const context: SeriesBetContext = {
        prediction: {
          homeTeamScore: bet.homeTeamScore,
          awayTeamScore: bet.awayTeamScore,
        },
        actual: {
          homeTeamScore: actualHomeScore,
          awayTeamScore: actualAwayScore,
        },
      }

      // Check series-exact
      if (evaluateSeriesExact(context)) {
        points += evaluatorByType['series-exact'] ?? 0
      }
      // Check series-winner (only if not exact)
      else if (evaluateSeriesWinner(context)) {
        points += evaluatorByType['series-winner'] ?? 0
      }

      // Update bet with calculated points
      await tx.userSpecialBetSerie.update({
        where: { id: bet.id },
        data: {
          totalPoints: points,
          updatedAt: now,
        },
      })
    }

    // Mark series as evaluated
    await tx.leagueSpecialBetSerie.update({
      where: { id: seriesId },
      data: {
        isEvaluated: true,
        updatedAt: now,
      },
    })

    return { evaluatedBets: series.UserSpecialBetSerie.length }
  }, {
    isolationLevel: 'Serializable',
  })

  revalidatePath('/admin/series')
  return { success: true, evaluatedBets: result.evaluatedBets }
}
