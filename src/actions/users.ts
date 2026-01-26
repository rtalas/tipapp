'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { buildLeagueUserWhere } from '@/lib/query-builders'

// Get pending user requests
export async function getPendingRequests(filters?: { leagueId?: number }) {
  return prisma.userRequest.findMany({
    where: {
      decided: false,
      deletedAt: null,
      ...(filters?.leagueId && { leagueId: filters.leagueId }),
    },
    include: {
      User: true,
      League: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Approve a user request
export async function approveRequest(requestId: number) {
  await requireAdmin()

  const now = new Date()

  // Get the request
  const request = await prisma.userRequest.findUnique({
    where: { id: requestId },
    include: { User: true, League: true },
  })

  if (!request) {
    throw new Error('Request not found')
  }

  if (request.decided) {
    throw new Error('Request has already been decided')
  }

  // Transaction: Create LeagueUser and update request
  await prisma.$transaction(async (tx) => {
    // Check if user is already a member
    const existingMembership = await tx.leagueUser.findFirst({
      where: {
        userId: request.userId,
        leagueId: request.leagueId,
        deletedAt: null,
      },
    })

    if (!existingMembership) {
      // Create league user membership
      await tx.leagueUser.create({
        data: {
          userId: request.userId,
          leagueId: request.leagueId,
          paid: false,
          active: true,
          admin: false,
          createdAt: now,
          updatedAt: now,
        },
      })
    }

    // Mark request as approved
    await tx.userRequest.update({
      where: { id: requestId },
      data: {
        decided: true,
        accepted: true,
        updatedAt: now,
      },
    })
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${request.leagueId}/users`)
  return { success: true }
}

// Reject a user request
export async function rejectRequest(requestId: number) {
  await requireAdmin()

  const request = await prisma.userRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    throw new Error('Request not found')
  }

  if (request.decided) {
    throw new Error('Request has already been decided')
  }

  await prisma.userRequest.update({
    where: { id: requestId },
    data: {
      decided: true,
      accepted: false,
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${request.leagueId}/users`)
  return { success: true }
}

// Get all users (for filter dropdowns)
export async function getUsers() {
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
}

// Export type for components
export type UserBasic = Awaited<ReturnType<typeof getUsers>>[number]

// Get league users with filters
export async function getLeagueUsers(filters?: { leagueId?: number }) {
  const whereConditions = buildLeagueUserWhere(filters)

  return prisma.leagueUser.findMany({
    where: whereConditions,
    include: {
      User: true,
      League: true,
    },
    orderBy: [{ League: { name: 'asc' } }, { User: { lastName: 'asc' } }],
  })
}

// Update league user admin status
export async function updateLeagueUserAdmin(leagueUserId: number, isAdmin: boolean) {
  await requireAdmin()

  const leagueUser = await prisma.leagueUser.update({
    where: { id: leagueUserId },
    data: {
      admin: isAdmin,
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)
  return { success: true }
}

// Update league user active status
export async function updateLeagueUserActive(leagueUserId: number, isActive: boolean) {
  await requireAdmin()

  const leagueUser = await prisma.leagueUser.update({
    where: { id: leagueUserId },
    data: {
      active: isActive,
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)
  return { success: true }
}

// Update league user paid status
export async function updateLeagueUserPaid(leagueUserId: number, isPaid: boolean) {
  await requireAdmin()

  const leagueUser = await prisma.leagueUser.update({
    where: { id: leagueUserId },
    data: {
      paid: isPaid,
      updatedAt: new Date(),
    },
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)
  return { success: true }
}

// Add user to league
export async function addUserToLeague(userId: number, leagueId: number) {
  await requireAdmin()

  const now = new Date()

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Check if league exists
  const league = await prisma.league.findUnique({
    where: { id: leagueId, deletedAt: null },
  })

  if (!league) {
    throw new Error('League not found')
  }

  // Check if user is already a member
  const existingMembership = await prisma.leagueUser.findFirst({
    where: {
      userId,
      leagueId,
      deletedAt: null,
    },
  })

  if (existingMembership) {
    throw new Error('User is already a member of this league')
  }

  // Create league user membership
  await prisma.leagueUser.create({
    data: {
      userId,
      leagueId,
      paid: false,
      active: true,
      admin: false,
      createdAt: now,
      updatedAt: now,
    },
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/${leagueId}/users`)
  return { success: true }
}

// Remove user from league
export async function removeLeagueUser(leagueUserId: number) {
  await requireAdmin()

  // Soft delete
  const leagueUser = await prisma.leagueUser.update({
    where: { id: leagueUserId },
    data: {
      deletedAt: new Date(),
    },
  })

  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)
  return { success: true }
}
