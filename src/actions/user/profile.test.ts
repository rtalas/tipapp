import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserProfile, updateProfile, updateAvatar } from './profile'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockAuth = vi.mocked(auth)

const mockSession = { user: { id: '5', isSuperadmin: false } }

describe('User Profile Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(mockSession as any)
  })

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      const user = { id: 5, username: 'john', email: 'john@test.com' }
      mockPrisma.user.findUnique.mockResolvedValue(user as any)

      const result = await getUserProfile()

      expect(result).toEqual(user)
    })

    it('should throw when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      await expect(getUserProfile()).rejects.toThrow('Not authenticated')
    })

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(getUserProfile()).rejects.toThrow('User not found')
    })
  })

  describe('updateProfile', () => {
    it('should update profile with unique email', async () => {
      const txMocks = {
        user: {
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await updateProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        notifyHours: 2,
      })

      expect(result.success).toBe(true)
    })

    it('should return error when email taken', async () => {
      const txMocks = {
        user: {
          findFirst: vi.fn().mockResolvedValue({ id: 99 }),
          update: vi.fn(),
        },
      }
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await updateProfile({
        firstName: 'John',
        lastName: 'Doe',
        email: 'taken@test.com',
        notifyHours: 2,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already in use')
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await updateProfile({
        firstName: 'J',
        lastName: 'D',
        email: 'j@test.com',
        notifyHours: 1,
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Not authenticated')
    })
  })

  describe('updateAvatar', () => {
    it('should update avatar URL', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 5 } as any)

      const result = await updateAvatar('https://example.com/avatar.png')

      expect(result.success).toBe(true)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: expect.objectContaining({ avatarUrl: 'https://example.com/avatar.png' }),
      })
    })

    it('should set avatar to null', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 5 } as any)

      const result = await updateAvatar(null)

      expect(result.success).toBe(true)
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await updateAvatar('https://example.com/avatar.png')

      expect(result.success).toBe(false)
    })

    it('should reject invalid URL', async () => {
      const result = await updateAvatar('not-a-url')

      expect(result.success).toBe(false)
    })
  })
})
