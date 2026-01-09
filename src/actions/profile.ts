'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { executeServerAction } from '@/lib/server-action-utils'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  mobileNumber: z.string().max(255).optional().nullable(),
  notifyHours: z.number().int().min(0).max(24).default(2),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
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

  const userId = parseInt(session.user.id, 10)

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

  const userId = parseInt(session.user.id, 10)

  return executeServerAction(input, {
    validator: updateProfileSchema,
    handler: async (validated) => {
      const now = new Date()

      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: validated.email,
          id: { not: userId },
          deletedAt: null,
        },
      })

      if (existingUser) {
        throw new Error('Email is already taken')
      }

      // Update user profile
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          email: validated.email,
          mobileNumber: validated.mobileNumber || null,
          notifyHours: validated.notifyHours,
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

  const userId = parseInt(session.user.id, 10)

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
        throw new Error('User not found')
      }

      // Verify current password using bcrypt.compare
      const isValid = await bcryptjs.compare(validated.currentPassword, user.password)

      if (!isValid) {
        throw new Error('Current password is incorrect')
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
