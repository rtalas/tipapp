'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { nullableUniqueConstraint } from '@/lib/prisma-utils'
import { requireAdmin, parseSessionUserId } from '@/lib/auth/auth-utils'
import { executeServerAction } from '@/lib/server-action-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { buildLeagueUserWhere } from '@/lib/query-builders'
import { AppError } from '@/lib/error-handler'
import {
  deleteByIdSchema,
  updateLeagueUserBooleanSchema,
  addUserToLeagueSchema,
  removeLeagueUserSchema,
  updateUserSchema,
  type UpdateLeagueUserBooleanInput,
  type AddUserToLeagueInput,
  type RemoveLeagueUserInput,
  type UpdateUserInput,
} from '@/lib/validation/admin'

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
  return executeServerAction({ id: requestId }, {
    validator: deleteByIdSchema,
    handler: async (validated, session) => {
      const now = new Date()

      // All checks inside transaction to prevent race conditions
      const request = await prisma.$transaction(async (tx) => {
        const req = await tx.userRequest.findUnique({
          where: { id: validated.id },
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
          where: { id: validated.id },
          data: {
            decided: true,
            accepted: true,
            updatedAt: now,
          },
        })

        return req
      })

      updateTag('league-selector')
      revalidatePath(`/admin/leagues/${request.leagueId}/users`)

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'UserRequest', validated.id,
        { action: 'approve', userId: request.userId, leagueId: request.leagueId },
        request.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}

// Reject a user request
export async function rejectRequest(requestId: number) {
  return executeServerAction({ id: requestId }, {
    validator: deleteByIdSchema,
    handler: async (validated, session) => {
      // Fetch request first to get leagueId and validate existence
      const request = await prisma.userRequest.findUnique({
        where: { id: validated.id },
        select: { id: true, leagueId: true, decided: true },
      })

      if (!request) {
        throw new AppError('Request not found', 'NOT_FOUND', 404)
      }

      if (request.decided) {
        throw new AppError('Request has already been decided', 'CONFLICT', 409)
      }

      // Atomic update — decided: false in where prevents race conditions
      const { count } = await prisma.userRequest.updateMany({
        where: { id: validated.id, decided: false },
        data: {
          decided: true,
          accepted: false,
          updatedAt: new Date(),
        },
      })

      if (count === 0) {
        // Race: decided between find and update
        throw new AppError('Request has already been decided', 'CONFLICT', 409)
      }

      revalidatePath(`/admin/leagues/${request.leagueId}/users`)

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'UserRequest', validated.id,
        { action: 'reject', leagueId: request.leagueId },
        request.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
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

// Get all users with league counts (for global admin users page)
export async function getAllUsersForAdmin() {
  await requireAdmin()
  return prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      isSuperadmin: true,
      createdAt: true,
      _count: {
        select: {
          LeagueUser: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
}

export type AdminUser = Awaited<ReturnType<typeof getAllUsersForAdmin>>[number]

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
export async function updateLeagueUserAdmin(input: UpdateLeagueUserBooleanInput) {
  return executeServerAction(input, {
    validator: updateLeagueUserBooleanSchema,
    handler: async (validated, session) => {
      const leagueUser = await prisma.leagueUser.update({
        where: { id: validated.leagueUserId },
        data: {
          admin: validated.value,
          updatedAt: new Date(),
        },
      })

      revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeagueUser', validated.leagueUserId,
        { field: 'admin', value: validated.value },
        leagueUser.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}

// Update league user active status
export async function updateLeagueUserActive(input: UpdateLeagueUserBooleanInput) {
  return executeServerAction(input, {
    validator: updateLeagueUserBooleanSchema,
    handler: async (validated, session) => {
      const leagueUser = await prisma.leagueUser.update({
        where: { id: validated.leagueUserId },
        data: {
          active: validated.value,
          updatedAt: new Date(),
        },
      })

      updateTag('league-selector')
      revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeagueUser', validated.leagueUserId,
        { field: 'active', value: validated.value },
        leagueUser.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}

// Update league user paid status
export async function updateLeagueUserPaid(input: UpdateLeagueUserBooleanInput) {
  return executeServerAction(input, {
    validator: updateLeagueUserBooleanSchema,
    handler: async (validated, session) => {
      const leagueUser = await prisma.leagueUser.update({
        where: { id: validated.leagueUserId },
        data: {
          paid: validated.value,
          updatedAt: new Date(),
        },
      })

      revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'LeagueUser', validated.leagueUserId,
        { field: 'paid', value: validated.value },
        leagueUser.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}

// Add user to league
export async function addUserToLeague(input: AddUserToLeagueInput) {
  return executeServerAction(input, {
    validator: addUserToLeagueSchema,
    handler: async (validated, session) => {
      const now = new Date()

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: validated.userId, deletedAt: null },
      })

      if (!user) {
        throw new AppError('User not found', 'NOT_FOUND', 404)
      }

      // Check if league exists
      const league = await prisma.league.findUnique({
        where: { id: validated.leagueId, deletedAt: null },
      })

      if (!league) {
        throw new AppError('League not found', 'NOT_FOUND', 404)
      }

      // Atomic upsert to prevent race condition duplicates
      const result = await prisma.leagueUser.upsert({
        where: {
          leagueId_userId_deletedAt: nullableUniqueConstraint({
            leagueId: validated.leagueId,
            userId: validated.userId,
            deletedAt: null,
          }),
        },
        update: {
          // Already exists — no-op, will throw below
          updatedAt: now,
        },
        create: {
          userId: validated.userId,
          leagueId: validated.leagueId,
          paid: false,
          active: true,
          admin: false,
          createdAt: now,
          updatedAt: now,
        },
      })

      if (result.createdAt.getTime() !== now.getTime()) {
        throw new AppError('User is already a member of this league', 'CONFLICT', 409)
      }

      updateTag('league-selector')
      revalidatePath(`/admin/${validated.leagueId}/users`)

      AuditLogger.adminCreated(
        parseSessionUserId(session!.user!.id!), 'LeagueUser', result.id,
        { userId: validated.userId, leagueId: validated.leagueId },
        validated.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}

// Update user (global admin)
export async function updateUser(input: UpdateUserInput) {
  return executeServerAction(input, {
    validator: updateUserSchema,
    handler: async (validated, session) => {
      const user = await prisma.user.findUnique({
        where: { id: validated.id, deletedAt: null },
      })

      if (!user) {
        throw new AppError('User not found', 'NOT_FOUND', 404)
      }

      // Check unique username if changed
      if (validated.username && validated.username !== user.username) {
        const existing = await prisma.user.findFirst({
          where: { username: validated.username, deletedAt: null, id: { not: validated.id } },
        })
        if (existing) {
          throw new AppError('Username is already taken', 'CONFLICT', 409)
        }
      }

      // Check unique email if changed
      if (validated.email && validated.email !== user.email) {
        const normalizedEmail = validated.email.toLowerCase()
        const existing = await prisma.user.findFirst({
          where: { email: normalizedEmail, deletedAt: null, id: { not: validated.id } },
        })
        if (existing) {
          throw new AppError('Email is already taken', 'CONFLICT', 409)
        }
        validated.email = normalizedEmail
      }

      const { id, ...updateData } = validated
      await prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })

      AuditLogger.adminUpdated(
        parseSessionUserId(session!.user!.id!), 'User', id,
        updateData
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}

// Delete user (soft delete, global admin)
export async function deleteUser(id: number) {
  return executeServerAction({ id }, {
    validator: deleteByIdSchema,
    handler: async (validated, session) => {
      const user = await prisma.user.findUnique({
        where: { id: validated.id, deletedAt: null },
      })

      if (!user) {
        throw new AppError('User not found', 'NOT_FOUND', 404)
      }

      await prisma.user.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'User', validated.id,
        { username: user.username }
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}

// Remove user from league
export async function removeLeagueUser(input: RemoveLeagueUserInput) {
  return executeServerAction(input, {
    validator: removeLeagueUserSchema,
    handler: async (validated, session) => {
      const leagueUser = await prisma.leagueUser.update({
        where: { id: validated.leagueUserId },
        data: {
          deletedAt: new Date(),
        },
      })

      updateTag('league-selector')
      revalidatePath(`/admin/leagues/${leagueUser.leagueId}/users`)

      AuditLogger.adminDeleted(
        parseSessionUserId(session!.user!.id!), 'LeagueUser', validated.leagueUserId,
        { leagueId: leagueUser.leagueId },
        leagueUser.leagueId
      ).catch(() => {})

      return {}
    },
    revalidatePath: '/admin/users',
    requiresAdmin: true,
  })
}
