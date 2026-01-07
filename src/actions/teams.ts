'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { createTeamSchema, updateTeamSchema, type CreateTeamInput, type UpdateTeamInput } from '@/lib/validation/admin'

// Get all teams with Sport relation
export async function getAllTeams() {
  return prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      Sport: true,
      _count: {
        select: { LeagueTeam: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Get team by ID
export async function getTeamById(id: number) {
  return prisma.team.findUnique({
    where: { id },
    include: {
      Sport: true,
    },
  })
}

// Get teams by sport
export async function getTeamsBySport(sportId: number) {
  return prisma.team.findMany({
    where: {
      sportId,
      deletedAt: null,
    },
    include: {
      Sport: true,
    },
    orderBy: { name: 'asc' },
  })
}

// Create new team
export async function createTeam(input: CreateTeamInput) {
  await requireAdmin()

  // Validate input
  const validated = createTeamSchema.parse(input)

  // Check if sport exists
  const sport = await prisma.sport.findUnique({
    where: { id: validated.sportId },
  })

  if (!sport) {
    throw new Error('Sport not found')
  }

  const team = await prisma.team.create({
    data: {
      name: validated.name,
      nickname: validated.nickname,
      shortcut: validated.shortcut,
      flagIcon: validated.flagIcon,
      sportId: validated.sportId,
      externalId: validated.externalId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      Sport: true,
    },
  })

  revalidatePath('/admin/teams')
  return { success: true, teamId: team.id }
}

// Update team
export async function updateTeam(input: UpdateTeamInput) {
  await requireAdmin()

  if (!input.id) {
    throw new Error('Team ID is required')
  }

  // Validate input
  const validated = updateTeamSchema.parse(input)

  // Check if sport exists (if being updated)
  if (validated.sportId) {
    const sport = await prisma.sport.findUnique({
      where: { id: validated.sportId },
    })

    if (!sport) {
      throw new Error('Sport not found')
    }
  }

  // Check if team exists
  const existingTeam = await prisma.team.findUnique({
    where: { id: validated.id },
  })

  if (!existingTeam) {
    throw new Error('Team not found')
  }

  await prisma.team.update({
    where: { id: validated.id },
    data: {
      name: validated.name,
      nickname: validated.nickname,
      shortcut: validated.shortcut,
      flagIcon: validated.flagIcon,
      sportId: validated.sportId,
      externalId: validated.externalId,
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/teams')
  return { success: true }
}

// Delete team (soft delete)
export async function deleteTeam(id: number) {
  await requireAdmin()

  // Check if team exists
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      _count: {
        select: { LeagueTeam: true },
      },
    },
  })

  if (!team) {
    throw new Error('Team not found')
  }

  // Warn if team is assigned to leagues
  if (team._count.LeagueTeam > 0) {
    console.warn(
      `Team "${team.name}" is assigned to ${team._count.LeagueTeam} league(s). Soft deleting.`
    )
  }

  // Soft delete
  await prisma.team.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/teams')
  return { success: true }
}
