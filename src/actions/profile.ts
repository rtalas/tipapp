'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { AppError } from '@/lib/error-handler'
import { parseSessionUserId } from '@/lib/auth/auth-utils'
import { updateProfileSchema } from '@/lib/validation/user'
import type { UpdateProfileInput } from '@/lib/validation/user'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'
import { passwordField } from '@/lib/validation'

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordField,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Not authenticated',
    }
  }

  const userId = parseSessionUserId(session.user.id)

  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      mobileNumber: true,
      notifyHours: true,
      notifyChat: true,
      isSuperadmin: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return {
      success: false,
      error: 'User not found',
    }
  }

  return {
    success: true,
    user,
  }
}

/**
 * Update current user's profile
 */
export async function updateProfile(input: UpdateProfileInput) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Not authenticated',
    }
  }

  const userId = parseSessionUserId(session.user.id)

  return executeServerAction(input, {
    validator: updateProfileSchema,
    handler: async (validated) => {
      const now = new Date()

      const normalizedEmail = validated.email.toLowerCase()

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          id: { not: userId },
          deletedAt: null,
        },
      })

      if (existingUser) {
        throw new AppError('Email is already taken', 'CONFLICT', 409)
      }

      // Update user profile
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          email: normalizedEmail,
          mobileNumber: validated.mobileNumber || null,
          notifyHours: validated.notifyHours,
          notifyChat: validated.notifyChat,
          updatedAt: now,
        },
      })

      return {}
    },
    revalidatePath: '/admin/profile',
    requiresAdmin: false, // Any authenticated user can update their profile
  })
}

/**
 * Update current user's password
 */
export async function updatePassword(input: UpdatePasswordInput) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      success: false,
      error: 'Not authenticated',
    }
  }

  const userId = parseSessionUserId(session.user.id)

  return executeServerAction(input, {
    validator: updatePasswordSchema,
    handler: async (validated) => {
      const now = new Date()

      // Get current user with password
      const user = await prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        select: {
          id: true,
          password: true,
        },
      })

      if (!user) {
        throw new AppError('User not found', 'NOT_FOUND', 404)
      }

      // Verify current password using bcrypt.compare
      const isValid = await bcryptjs.compare(validated.currentPassword, user.password)

      if (!isValid) {
        throw new AppError('Current password is incorrect', 'UNAUTHORIZED', 401)
      }

      // Hash new password
      const newPasswordHash = await bcryptjs.hash(validated.newPassword, 12)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: newPasswordHash,
          updatedAt: now,
        },
      })

      return {}
    },
    revalidatePath: '/admin/profile',
    requiresAdmin: false,
  })
}
