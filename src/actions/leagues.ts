'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import {
  createLeagueSchema,
  updateLeagueSchema,
  updateEvaluatorSchema,
  assignTeamSchema,
  assignPlayerSchema,
  type CreateLeagueInput,
  type UpdateLeagueInput,
  type UpdateEvaluatorInput,
  type AssignTeamInput,
  type AssignPlayerInput,
} from '@/lib/validation/admin'

// Default scoring rules (T2: Automatic Evaluator Initialization)
const DEFAULT_EVALUATOR_POINTS: Record<string, number> = {
  'exact_score': 5,
  'winner': 2,
  'goal_difference': 3,
  'total_goals': 1,
  'scorer': 2,
}

export async function createLeague(input: CreateLeagueInput) {
  await requireAdmin()

  const validated = createLeagueSchema.parse(input)

  const now = new Date()

  // Transaction: Create league + evaluators
  const result = await prisma.$transaction(async (tx) => {
    // Create the league
    const league = await tx.league.create({
      data: {
        name: validated.name,
        sportId: validated.sportId,
        seasonFrom: validated.seasonFrom,
        seasonTo: validated.seasonTo,
        isActive: validated.isActive,
        isPublic: validated.isPublic,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Get all evaluator types for name mapping
    const evaluatorTypes = await tx.evaluatorType.findMany()
    const typeMap = new Map(evaluatorTypes.map((t) => [t.id, t.name]))

    // Create evaluators from selected rules or use defaults
    if (validated.evaluatorRules && validated.evaluatorRules.length > 0) {
      // Use selected evaluator rules
      await tx.evaluator.createMany({
        data: validated.evaluatorRules.map((rule) => ({
          evaluatorTypeId: rule.evaluatorTypeId,
          leagueId: league.id,
          points: String(rule.points),
          entity: 'match',
          name: typeMap.get(rule.evaluatorTypeId) || 'Rule',
          createdAt: now,
          updatedAt: now,
        })),
      })
    } else {
      // Fall back to defaults if no rules selected
      if (evaluatorTypes.length > 0) {
        await tx.evaluator.createMany({
          data: evaluatorTypes.map((type) => ({
            name: type.name,
            evaluatorTypeId: type.id,
            leagueId: league.id,
            points: String(DEFAULT_EVALUATOR_POINTS[type.name] ?? 1),
            entity: 'match',
            createdAt: now,
            updatedAt: now,
          })),
        })
      }
    }

    return league
  })

  revalidatePath('/admin/leagues')
  return { success: true, leagueId: result.id }
}

export async function updateLeague(input: UpdateLeagueInput) {
  await requireAdmin()

  const validated = updateLeagueSchema.parse(input)
  const { id, ...data } = validated

  await prisma.league.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/leagues')
  revalidatePath(`/admin/leagues/${id}`)
  return { success: true }
}

export async function deleteLeague(leagueId: number) {
  await requireAdmin()

  // Soft delete by setting deletedAt
  await prisma.league.update({
    where: { id: leagueId },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/leagues')
  return { success: true }
}

export async function updateEvaluatorRules(input: UpdateEvaluatorInput) {
  await requireAdmin()

  const validated = updateEvaluatorSchema.parse(input)

  // Update each evaluator rule
  await prisma.$transaction(
    validated.rules.map((rule) =>
      prisma.evaluator.updateMany({
        where: {
          leagueId: validated.leagueId,
          evaluatorTypeId: rule.evaluatorTypeId,
        },
        data: {
          points: String(rule.points),
          updatedAt: new Date(),
        },
      })
    )
  )

  revalidatePath(`/admin/leagues/${validated.leagueId}`)
  return { success: true }
}

export async function assignTeamToLeague(input: AssignTeamInput) {
  await requireAdmin()

  const validated = assignTeamSchema.parse(input)

  // Check if team is already assigned
  const existing = await prisma.leagueTeam.findFirst({
    where: {
      leagueId: validated.leagueId,
      teamId: validated.teamId,
      deletedAt: null,
    },
  })

  if (existing) {
    throw new Error('Team is already assigned to this league')
  }

  const now = new Date()
  await prisma.leagueTeam.create({
    data: {
      leagueId: validated.leagueId,
      teamId: validated.teamId,
      group: validated.group,
      createdAt: now,
      updatedAt: now,
    },
  })

  revalidatePath(`/admin/leagues/${validated.leagueId}/setup`)
  return { success: true }
}

export async function removeTeamFromLeague(leagueTeamId: number) {
  await requireAdmin()

  // Soft delete
  await prisma.leagueTeam.update({
    where: { id: leagueTeamId },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/leagues')
  return { success: true }
}

export async function updateTeamGroup(leagueTeamId: number, group: string | null) {
  await requireAdmin()

  await prisma.leagueTeam.update({
    where: { id: leagueTeamId },
    data: { group },
  })

  revalidatePath('/admin/leagues')
  return { success: true }
}

export async function assignPlayerToLeagueTeam(input: AssignPlayerInput) {
  await requireAdmin()

  const validated = assignPlayerSchema.parse(input)

  // Check if player is already assigned to this league team
  const existing = await prisma.leaguePlayer.findFirst({
    where: {
      leagueTeamId: validated.leagueTeamId,
      playerId: validated.playerId,
      deletedAt: null,
    },
  })

  if (existing) {
    throw new Error('Player is already assigned to this team in this league')
  }

  const now = new Date()
  await prisma.leaguePlayer.create({
    data: {
      leagueTeamId: validated.leagueTeamId,
      playerId: validated.playerId,
      seasonGames: validated.seasonGames,
      seasonGoals: validated.seasonGoals,
      clubName: validated.clubName,
      createdAt: now,
      updatedAt: now,
    },
  })

  revalidatePath('/admin/leagues')
  return { success: true }
}

export async function removePlayerFromLeagueTeam(leaguePlayerId: number) {
  await requireAdmin()

  // Soft delete
  await prisma.leaguePlayer.update({
    where: { id: leaguePlayerId },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/leagues')
  return { success: true }
}

// Query functions (can be used in Server Components)
export async function getLeagues() {
  return prisma.league.findMany({
    where: { deletedAt: null },
    include: {
      Sport: true,
      Evaluator: {
        include: { EvaluatorType: true },
      },
      _count: {
        select: {
          LeagueTeam: { where: { deletedAt: null } },
          LeagueUser: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLeagueById(id: number) {
  return prisma.league.findUnique({
    where: { id, deletedAt: null },
    include: {
      Sport: true,
      Evaluator: {
        include: { EvaluatorType: true },
      },
      LeagueTeam: {
        where: { deletedAt: null },
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
          },
        },
        orderBy: { Team: { name: 'asc' } },
      },
    },
  })
}

export async function getSports() {
  return prisma.sport.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  })
}
