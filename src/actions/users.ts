'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/auth-utils'
import { buildLeagueUserWhere } from '@/lib/query-builders'
import { AppError } from '@/lib/error-handler'

// Get pending user requests
export async function getPendingRequests(filters?: { leagueId?: number }) {
  await requireAdmin()
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

  // All checks inside transaction to prevent race conditions
  const request = await prisma.$transaction(async (tx) => {
    const req = await tx.userRequest.findUnique({
      where: { id: requestId },
      include: { User: true, League: true },
    })

    if (!req) {
      throw new AppError('Request not found', 'NOT_FOUND', 404)
    }

    if (req.decided) {
      throw new AppError('Request has already been decided', 'CONFLICT', 409)
    }

    // Check if user is already a member
    const existingMembership = await tx.leagueUser.findFirst({
      where: {
        userId: req.userId,
        leagueId: req.leagueId,
        deletedAt: null,
      },
    })

    if (!existingMembership) {
      await tx.leagueUser.create({
        data: {
          userId: req.userId,
          leagueId: req.leagueId,
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

    return req
  })

  revalidateTag('league-selector', 'max')
  revalidateTag('leaderboard', 'max')
  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${request.leagueId}/users`)
  return { success: true }
}

// Reject a user request
export async function rejectRequest(requestId: number) {
  await requireAdmin()

  // Atomic update — decided: false in where prevents race conditions
  const { count } = await prisma.userRequest.updateMany({
    where: { id: requestId, decided: false },
    data: {
      decided: true,
      accepted: false,
      updatedAt: new Date(),
    },
  })

  if (count === 0) {
    // Distinguish not-found from already-decided
    const exists = await prisma.userRequest.findUnique({
      where: { id: requestId },
      select: { id: true, leagueId: true },
    })
    if (!exists) {
      throw new AppError('Request not found', 'NOT_FOUND', 404)
    }
    throw new AppError('Request has already been decided', 'CONFLICT', 409)
  }

  // Need leagueId for revalidation
  const request = await prisma.userRequest.findUnique({
    where: { id: requestId },
    select: { leagueId: true },
  })

  revalidatePath('/admin/users')
  if (request) {
    revalidatePath(`/admin/leagues/${request.leagueId}/users`)
  }
  return { success: true }
}

// Get all users (for filter dropdowns)
export async function getUsers() {
  await requireAdmin()
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
  await requireAdmin()
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

  // Invalidate league selector cache (active status affects user's available leagues)
  revalidateTag('league-selector', 'max')
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
    throw new AppError('User not found', 'NOT_FOUND', 404)
  }

  // Check if league exists
  const league = await prisma.league.findUnique({
    where: { id: leagueId, deletedAt: null },
  })

  if (!league) {
    throw new AppError('League not found', 'NOT_FOUND', 404)
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
    throw new AppError('User is already a member of this league', 'CONFLICT', 409)
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

  // Invalidate league selector and leaderboard caches for the added user
  revalidateTag('league-selector', 'max')
  revalidateTag('leaderboard', 'max')
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

  // Invalidate league selector and leaderboard caches for the removed user
  revalidateTag('league-selector', 'max')
  revalidateTag('leaderboard', 'max')
  revalidatePath('/admin/users')
  revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)
  return { success: true }
}
