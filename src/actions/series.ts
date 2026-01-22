'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { buildSeriesWhere } from '@/lib/query-builders'
import { seriesInclude } from '@/lib/prisma-helpers'
import {
  createSeriesSchema,
  updateSeriesResultSchema,
  type CreateSeriesInput,
  type UpdateSeriesResultInput,
} from '@/lib/validation/admin'

export async function createSeries(input: CreateSeriesInput) {
  return executeServerAction(input, {
    validator: createSeriesSchema,
    handler: async (validated) => {
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

      return { seriesId: series.id }
    },
    revalidatePath: '/admin/series',
    requiresAdmin: true,
  })
}

export async function updateSeriesResult(input: UpdateSeriesResultInput) {
  return executeServerAction(input, {
    validator: updateSeriesResultSchema,
    handler: async (validated) => {
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

      return {}
    },
    revalidatePath: '/admin/series',
    requiresAdmin: true,
  })
}

export async function deleteSeries(id: number) {
  'use server'
  return executeServerAction({ id }, {
    validator: z.object({ id: z.number().int().positive() }),
    handler: async (validated) => {
      await prisma.leagueSpecialBetSerie.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })
      return {}
    },
    revalidatePath: '/admin/series',
    requiresAdmin: true,
  })
}
