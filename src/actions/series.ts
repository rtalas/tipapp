'use server'

import { z } from 'zod'
import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { parseSessionUserId } from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { AppError } from '@/lib/error-handler'
import {
  createSeriesSchema,
  updateSeriesResultSchema,
  updateSeriesSchema,
  type CreateSeriesInput,
  type UpdateSeriesResultInput,
  type UpdateSeriesInput,
} from '@/lib/validation/admin'

export async function createSeries(input: CreateSeriesInput) {
  return executeServerAction(input, {
    validator: createSeriesSchema,
    handler: async (validated, session) => {
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
        throw new AppError('Teams must belong to the selected league', 'BAD_REQUEST', 400)
      }

      // Verify series type exists
      const seriesType = await prisma.specialBetSerie.findFirst({
        where: { id: validated.specialBetSerieId, deletedAt: null },
      })

      if (!seriesType) {
        throw new AppError('Series type not found', 'NOT_FOUND', 404)
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

      // Invalidate user-facing series cache
      updateTag('series-data')

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'LeagueSpecialBetSerie', series.id,
        { leagueId: validated.leagueId, homeTeamId: validated.homeTeamId, awayTeamId: validated.awayTeamId },
        validated.leagueId
      ).catch(() => {})

      return { seriesId: series.id }
    },
    revalidatePath: '/admin/series',
    requiresAdmin: true,
  })
}

export async function updateSeriesResult(input: UpdateSeriesResultInput) {
  return executeServerAction(input, {
    validator: updateSeriesResultSchema,
    handler: async (validated, session) => {
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

      // Invalidate user-facing series cache
      updateTag('series-data')

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeagueSpecialBetSerie', validated.seriesId,
        { homeTeamScore: validated.homeTeamScore, awayTeamScore: validated.awayTeamScore }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/series',
    requiresAdmin: true,
  })
}

export async function updateSeries(input: UpdateSeriesInput) {
  return executeServerAction(input, {
    validator: updateSeriesSchema,
    handler: async (validated, session) => {
      await prisma.leagueSpecialBetSerie.update({
        where: { id: validated.seriesId },
        data: {
          dateTime: validated.dateTime,
          updatedAt: new Date(),
        },
      })

      updateTag('series-data')

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeagueSpecialBetSerie', validated.seriesId,
        { dateTime: validated.dateTime }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/series',
    requiresAdmin: true,
  })
}

export async function deleteSeries(id: number) {
  return executeServerAction({ id }, {
    validator: z.object({ id: z.number().int().positive() }),
    handler: async (validated, session) => {
      await prisma.leagueSpecialBetSerie.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      // Invalidate user-facing series cache
      updateTag('series-data')

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'LeagueSpecialBetSerie', validated.id
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/series',
    requiresAdmin: true,
  })
}
