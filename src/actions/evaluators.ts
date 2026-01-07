'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isSuperadmin) {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}

// Get all evaluators
export async function getAllEvaluators() {
  return prisma.evaluator.findMany({
    where: { deletedAt: null },
    include: {
      EvaluatorType: true,
      League: true,
    },
    orderBy: [{ League: { name: 'asc' } }, { EvaluatorType: { name: 'asc' } }],
  })
}

// Get evaluators for a specific league
export async function getLeagueEvaluators(leagueId: number) {
  return prisma.evaluator.findMany({
    where: {
      leagueId,
      deletedAt: null,
    },
    include: {
      EvaluatorType: true,
    },
    orderBy: { EvaluatorType: { name: 'asc' } },
  })
}

// Get all evaluator types
export async function getEvaluatorTypes() {
  return prisma.evaluatorType.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  })
}

// Update evaluator points
export async function updateEvaluatorPoints(evaluatorId: number, points: number) {
  await requireAdmin()

  if (points < 0) {
    throw new Error('Points cannot be negative')
  }

  await prisma.evaluator.update({
    where: { id: evaluatorId },
    data: {
      points: String(points),
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/evaluators')
  return { success: true }
}

// Create new evaluator
export async function createEvaluator(input: {
  leagueId: number
  evaluatorTypeId: number
  name: string
  points: number
}) {
  await requireAdmin()

  if (input.points < 0) {
    throw new Error('Points cannot be negative')
  }

  const evaluator = await prisma.evaluator.create({
    data: {
      leagueId: input.leagueId,
      evaluatorTypeId: input.evaluatorTypeId,
      name: input.name,
      points: String(input.points),
      entity: 'match',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/evaluators')
  return { success: true, evaluatorId: evaluator.id }
}

// Update evaluator name
export async function updateEvaluatorName(evaluatorId: number, name: string) {
  await requireAdmin()

  if (!name || name.trim().length === 0) {
    throw new Error('Name cannot be empty')
  }

  await prisma.evaluator.update({
    where: { id: evaluatorId },
    data: {
      name: name.trim(),
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/evaluators')
  return { success: true }
}

// Delete evaluator
export async function deleteEvaluator(evaluatorId: number) {
  await requireAdmin()

  await prisma.evaluator.update({
    where: { id: evaluatorId },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/evaluators')
  return { success: true }
}
