'use server'

import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import {
  createEvaluatorSchema,
  updateEvaluatorPointsSchema,
  updateEvaluatorNameSchema,
  deleteByIdSchema,
  type CreateEvaluatorInput,
  type UpdateEvaluatorPointsInput,
  type UpdateEvaluatorNameInput,
  type DeleteByIdInput,
} from '@/lib/validation/admin'

// Get evaluators for a specific league
export async function getLeagueEvaluators(leagueId: number) {
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
}

// Update evaluator points
export async function updateEvaluatorPoints(input: UpdateEvaluatorPointsInput) {
  return executeServerAction(input, {
    validator: updateEvaluatorPointsSchema,
    handler: async (validated) => {
      await prisma.evaluator.update({
        where: { id: validated.evaluatorId },
        data: {
          points: validated.points,
          updatedAt: new Date(),
        },
      })
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
    handler: async (validated) => {
      const evaluator = await prisma.evaluator.create({
        data: {
          leagueId: validated.leagueId,
          evaluatorTypeId: validated.evaluatorTypeId,
          name: validated.name,
          points: validated.points,
          ...(validated.config && { config: validated.config }),
          entity: 'match',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
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
    handler: async (validated) => {
      await prisma.evaluator.update({
        where: { id: validated.evaluatorId },
        data: {
          name: validated.name.trim(),
          updatedAt: new Date(),
        },
      })
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
    handler: async (validated) => {
      await prisma.evaluator.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })
      return {}
    },
    revalidatePath: '/admin/evaluators',
    requiresAdmin: true,
  })
}
