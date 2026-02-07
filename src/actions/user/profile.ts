'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { AppError } from '@/lib/error-handler'
import { executeServerAction } from '@/lib/server-action-utils'
import { updateProfileSchema } from '@/lib/validation/user'
import type { UpdateProfileInput } from '@/lib/validation/user'
import { z } from 'zod'

const updateAvatarSchema = z.object({
  avatarUrl: z.string().url().nullable(),
})

/**
 * Gets the current user's profile data
 */
export async function getUserProfile() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AppError('Not authenticated', 'UNAUTHORIZED', 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      mobileNumber: true,
      notifyHours: true,
      isSuperadmin: true,
      createdAt: true,
      avatarUrl: true,
    },
  })

  if (!user) {
    throw new AppError('User not found', 'NOT_FOUND', 404)
  }

  return user
}

/**
 * Updates the current user's profile information
 */
export async function updateProfile(input: UpdateProfileInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: 'Not authenticated' }
  }

  const userId = parseInt(session.user.id)

  return executeServerAction(input, {
    validator: updateProfileSchema,
    handler: async (validated) => {
      const normalizedEmail = validated.email?.toLowerCase()

      await prisma.$transaction(async (tx) => {
        if (normalizedEmail) {
          const existingUser = await tx.user.findFirst({
            where: {
              email: normalizedEmail,
              id: { not: userId },
              deletedAt: null,
            },
          })

          if (existingUser) {
            throw new AppError('Email is already in use', 'CONFLICT', 409)
          }
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            firstName: validated.firstName,
            lastName: validated.lastName,
            email: normalizedEmail,
            mobileNumber: validated.mobileNumber || null,
            notifyHours: validated.notifyHours,
            updatedAt: new Date(),
          },
        })
      })

      return {}
    },
    revalidatePath: '/profile',
  })
}

/**
 * Updates the current user's avatar URL
 */
export async function updateAvatar(avatarUrl: string | null) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: 'Not authenticated' }
  }

  const userId = parseInt(session.user.id)

  return executeServerAction({ avatarUrl }, {
    validator: updateAvatarSchema,
    handler: async (validated) => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: validated.avatarUrl,
          updatedAt: new Date(),
        },
      })

      return {}
    },
    revalidatePath: '/profile',
  })
}
