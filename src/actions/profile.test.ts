import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCurrentUserProfile, updateProfile, updatePassword } from './profile'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import bcryptjs from 'bcryptjs'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}))

const mockPrisma = vi.mocked(prisma, true)
const mockAuth = vi.mocked(auth)
const mockBcrypt = vi.mocked(bcryptjs)

const mockSession = { user: { id: '5', isSuperadmin: false } }

describe('Profile Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(mockSession as any)
  })

  describe('getCurrentUserProfile', () => {
    it('should return user profile', async () => {
      const user = { id: 5, username: 'john', email: 'john@test.com' }
      mockPrisma.user.findUnique.mockResolvedValue(user as any)

      const result = await getCurrentUserProfile()

      expect(result.success).toBe(true)
      expect((result as any).user).toEqual(user)
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await getCurrentUserProfile()

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Not authenticated')
    })

    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await getCurrentUserProfile()

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('User not found')
    })
  })

  describe('updateProfile', () => {
    it('should update profile when email is unique', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null) // no duplicate email
      mockPrisma.user.update.mockResolvedValue({ id: 5 } as any)

      const result = await updateProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notifyHours: 2,
      })

      expect(result.success).toBe(true)
    })

    it('should return error when email taken', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 99 } as any) // email taken

      const result = await updateProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'taken@test.com',
        notifyHours: 2,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Email is already taken')
    })

    it('should normalize email to lowercase', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)
      mockPrisma.user.update.mockResolvedValue({ id: 5 } as any)

      await updateProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'John@Test.COM',
        notifyHours: 2,
      })

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: 'john@test.com' }),
        })
      )
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'john@test.com' }),
        })
      )
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await updateProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notifyHours: 2,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Not authenticated')
    })
  })

  describe('updatePassword', () => {
    it('should update password when current password is correct', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5, password: 'hashed' } as any)
      mockBcrypt.compare.mockResolvedValue(true as never)
      mockBcrypt.hash.mockResolvedValue('newhash' as never)
      mockPrisma.user.update.mockResolvedValue({ id: 5 } as any)

      const result = await updatePassword({
        currentPassword: 'oldpass',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      })

      expect(result.success).toBe(true)
      expect(mockBcrypt.hash).toHaveBeenCalledWith('NewPassword123', 12)
    })

    it('should return error when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5, password: 'hashed' } as any)
      mockBcrypt.compare.mockResolvedValue(false as never)

      const result = await updatePassword({
        currentPassword: 'wrongpass',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Current password is incorrect')
    })

    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await updatePassword({
        currentPassword: 'pass',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('User not found')
    })

    it('should reject mismatching passwords', async () => {
      const result = await updatePassword({
        currentPassword: 'pass',
        newPassword: 'NewPassword123',
        confirmPassword: 'Different123',
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Passwords do not match')
    })

    it('should reject short passwords', async () => {
      const result = await updatePassword({
        currentPassword: 'pass',
        newPassword: 'short',
        confirmPassword: 'short',
      })

      expect(result.success).toBe(false)
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await updatePassword({
        currentPassword: 'pass',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Not authenticated')
    })
  })
})
