'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { getEvaluatorEntity } from '@/lib/evaluators'
import {
  createEvaluatorSchema,
  updateEvaluatorPointsSchema,
  updateEvaluatorNameSchema,
  updateEvaluatorSchema,
  deleteByIdSchema,
  type CreateEvaluatorInput,
  type UpdateEvaluatorPointsInput,
  type UpdateEvaluatorNameInput,
  type UpdateEvaluatorInput,
  type DeleteByIdInput,
} from '@/lib/validation/admin'

// Get evaluators for a specific league
export async function getLeagueEvaluators(leagueId: number) {
  await requireAdmin()
  return prisma.evaluator.findMany({
    where: {
      leagueId,
      deletedAt: null,
    },
    include: {
      EvaluatorType: true,
      League: true,
    },
    orderBy: { EvaluatorType: { name: 'asc' } },
  })
  // Note: config field is automatically included as part of the model
}

// Update evaluator points
export async function updateEvaluatorPoints(input: UpdateEvaluatorPointsInput) {
  return executeServerAction(input, {
    validator: updateEvaluatorPointsSchema,
    handler: async (validated, session) => {
      await prisma.evaluator.update({
        where: { id: validated.evaluatorId },
        data: {
          points: validated.points,
          updatedAt: new Date(),
        },
      })

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'Evaluator', validated.evaluatorId,
        { points: validated.points }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/evaluators',
    requiresAdmin: true,
  })
}

// Create new evaluator
export async function createEvaluator(input: CreateEvaluatorInput) {
  return executeServerAction(input, {
    validator: createEvaluatorSchema,
    handler: async (validated, session) => {
      // Fetch evaluator type to determine entity
      const evaluatorType = await prisma.evaluatorType.findUniqueOrThrow({
        where: { id: validated.evaluatorTypeId },
      })

      // Determine entity based on evaluator type name
      const entity = getEvaluatorEntity(evaluatorType.name)

      const evaluator = await prisma.evaluator.create({
        data: {
          leagueId: validated.leagueId,
          evaluatorTypeId: validated.evaluatorTypeId,
          name: validated.name.trim(),
          points: validated.points,
          ...(validated.config && { config: validated.config }),
          entity,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'Evaluator', evaluator.id,
        { name: validated.name, points: validated.points, leagueId: validated.leagueId },
        validated.leagueId
      ).catch(() => {})

      return { evaluatorId: evaluator.id }
    },
    revalidatePath: '/admin/evaluators',
    requiresAdmin: true,
  })
}

// Update evaluator name
export async function updateEvaluatorName(input: UpdateEvaluatorNameInput) {
  return executeServerAction(input, {
    validator: updateEvaluatorNameSchema,
    handler: async (validated, session) => {
      await prisma.evaluator.update({
        where: { id: validated.evaluatorId },
        data: {
          name: validated.name.trim(),
          updatedAt: new Date(),
        },
      })

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'Evaluator', validated.evaluatorId,
        { name: validated.name }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/evaluators',
    requiresAdmin: true,
  })
}

// Update evaluator (both name and points)
export async function updateEvaluator(input: UpdateEvaluatorInput) {
  return executeServerAction(input, {
    validator: updateEvaluatorSchema,
    handler: async (validated, session) => {
      const updateData: Prisma.EvaluatorUpdateInput = {
        name: validated.name.trim(),
        points: validated.points,
        updatedAt: new Date(),
      }

      // Handle config update - only include if explicitly provided
      if (validated.config !== undefined) {
        updateData.config = validated.config === null ? Prisma.JsonNull : (validated.config as Prisma.InputJsonValue)
      }

      await prisma.evaluator.update({
        where: { id: validated.evaluatorId },
        data: updateData,
      })

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'Evaluator', validated.evaluatorId,
        { name: validated.name, points: validated.points, hasConfig: validated.config !== undefined }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/evaluators',
    requiresAdmin: true,
  })
}

// Delete evaluator
export async function deleteEvaluator(input: DeleteByIdInput) {
  return executeServerAction(input, {
    validator: deleteByIdSchema,
    handler: async (validated, session) => {
      await prisma.evaluator.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'Evaluator', validated.id
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/evaluators',
    requiresAdmin: true,
  })
}
