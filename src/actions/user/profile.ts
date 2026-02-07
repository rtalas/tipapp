'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { AppError } from '@/lib/error-handler'
import { z } from 'zod'

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  mobileNumber: z.string().optional(),
  notifyHours: z.number().int().min(0).max(1440).default(0), // Stored as minutes (0-1440 = 24 hours)
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

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
    return { success: false, error: 'Not authenticated' }
  }

  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const { firstName, lastName, email, mobileNumber, notifyHours } = parsed.data
  const userId = parseInt(session.user.id)

  const normalizedEmail = email?.toLowerCase()

  try {
    await prisma.$transaction(async (tx) => {
      // Check if email is already taken by another user
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
          firstName,
          lastName,
          email: normalizedEmail,
          mobileNumber: mobileNumber || null,
          notifyHours,
          updatedAt: new Date(),
        },
      })
    })

    revalidatePath('/profile')
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update profile' }
  }
}

/**
 * Updates the current user's avatar URL
 */
export async function updateAvatar(avatarUrl: string | null) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const userId = parseInt(session.user.id)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl,
        updatedAt: new Date(),
      },
    })

    revalidatePath('/profile')
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to update avatar' }
  }
}

/**
 * Changes the current user's password
 */
export async function changePassword(input: ChangePasswordInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const { currentPassword, newPassword } = parsed.data
  const userId = parseInt(session.user.id)

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  })

  if (!user) {
    return { success: false, error: 'User not found' }
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password)
  if (!isValidPassword) {
    return { success: false, error: 'Current password is incorrect' }
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to change password' }
  }
}
