import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getUsers,
  getLeagueUsers,
  updateLeagueUserAdmin,
  updateLeagueUserActive,
  updateLeagueUserPaid,
  addUserToLeague,
  removeLeagueUser,
} from './users'
import { prisma } from '@/lib/prisma'
import * as authUtils from '@/lib/auth/auth-utils'
import { updateTag } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

vi.mock('@/lib/query-builders', () => ({
  buildLeagueUserWhere: vi.fn().mockReturnValue({}),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRequireAdmin = vi.mocked(authUtils.requireAdmin)
const mockUpdateTag = vi.mocked(updateTag)

describe('Users Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ user: { id: '1', isSuperadmin: true } } as any)
  })

  describe('getPendingRequests', () => {
    it('should return pending requests', async () => {
      const requests = [{ id: 1, decided: false }]
      mockPrisma.userRequest.findMany.mockResolvedValue(requests as any)

      const result = await getPendingRequests()

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result).toEqual(requests)
      expect(mockPrisma.userRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ decided: false, deletedAt: null }),
        })
      )
    })

    it('should filter by leagueId', async () => {
      mockPrisma.userRequest.findMany.mockResolvedValue([] as any)

      await getPendingRequests({ leagueId: 5 })

      expect(mockPrisma.userRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ leagueId: 5 }),
        })
      )
    })

    it('should require admin', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

      await expect(getPendingRequests()).rejects.toThrow('Unauthorized')
    })
  })

  describe('approveRequest', () => {
    const mockRequest = {
      id: 1,
      userId: 5,
      leagueId: 1,
      decided: false,
      User: { id: 5 },
      League: { id: 1 },
    }

    function makeTxMocks(overrides: { alreadyMember?: boolean; decided?: boolean; notFound?: boolean } = {}) {
      return {
        userRequest: {
          findUnique: vi.fn().mockResolvedValue(
            overrides.notFound ? null : { ...mockRequest, decided: overrides.decided ?? false }
          ),
          update: vi.fn(),
        },
        leagueUser: {
          findFirst: vi.fn().mockResolvedValue(overrides.alreadyMember ? { id: 10 } : null),
          create: vi.fn().mockResolvedValue({ id: 10 }),
        },
      }
    }

    it('should approve request and create membership', async () => {
      const txMocks = makeTxMocks()
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await approveRequest(1)

      expect(result.success).toBe(true)
      expect(txMocks.leagueUser.create).toHaveBeenCalled()
      expect(txMocks.userRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ decided: true, accepted: true }),
        })
      )
    })

    it('should skip membership creation if already member', async () => {
      const txMocks = makeTxMocks({ alreadyMember: true })
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await approveRequest(1)

      expect(txMocks.leagueUser.create).not.toHaveBeenCalled()
    })

    it('should return error when request not found', async () => {
      const txMocks = makeTxMocks({ notFound: true })
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await approveRequest(999)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Request not found')
    })

    it('should return error when already decided', async () => {
      const txMocks = makeTxMocks({ decided: true })
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      const result = await approveRequest(1)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already been decided')
    })

    it('should invalidate league-selector and leaderboard caches', async () => {
      const txMocks = makeTxMocks()
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

      await approveRequest(1)

      expect(mockUpdateTag).toHaveBeenCalledWith('league-selector')
    })

    it('should reject invalid requestId', async () => {
      const result = await approveRequest(-1)
      expect(result.success).toBe(false)
    })
  })

  describe('rejectRequest', () => {
    it('should reject request atomically', async () => {
      mockPrisma.userRequest.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.userRequest.findUnique.mockResolvedValue({ leagueId: 1 } as any)

      const result = await rejectRequest(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.userRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 1, decided: false },
        data: expect.objectContaining({ decided: true, accepted: false }),
      })
    })

    it('should return error when request not found', async () => {
      mockPrisma.userRequest.findUnique.mockResolvedValue(null)

      const result = await rejectRequest(999)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Request not found')
    })

    it('should return error when already decided', async () => {
      mockPrisma.userRequest.findUnique.mockResolvedValue({ id: 1, leagueId: 1, decided: true } as any)

      const result = await rejectRequest(1)

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already been decided')
    })

    it('should reject invalid requestId', async () => {
      const result = await rejectRequest(0)
      expect(result.success).toBe(false)
    })
  })

  describe('getUsers', () => {
    it('should return users list', async () => {
      const users = [{ id: 1, username: 'john' }]
      mockPrisma.user.findMany.mockResolvedValue(users as any)

      const result = await getUsers()

      expect(result).toEqual(users)
    })
  })

  describe('getLeagueUsers', () => {
    it('should return league users', async () => {
      mockPrisma.leagueUser.findMany.mockResolvedValue([{ id: 1 }] as any)

      const result = await getLeagueUsers({ leagueId: 1 })

      expect(result).toHaveLength(1)
    })
  })

  describe('updateLeagueUserAdmin', () => {
    it('should update admin status', async () => {
      mockPrisma.leagueUser.update.mockResolvedValue({ id: 1, leagueId: 5 } as any)

      const result = await updateLeagueUserAdmin({ leagueUserId: 1, value: true })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueUser.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { admin: true, updatedAt: expect.any(Date) },
      })
    })

    it('should reject invalid input', async () => {
      const result = await updateLeagueUserAdmin({ leagueUserId: -1, value: true })
      expect(result.success).toBe(false)
    })
  })

  describe('updateLeagueUserActive', () => {
    it('should update active status and invalidate cache', async () => {
      mockPrisma.leagueUser.update.mockResolvedValue({ id: 1, leagueId: 5 } as any)

      const result = await updateLeagueUserActive({ leagueUserId: 1, value: false })

      expect(result.success).toBe(true)
      expect(mockUpdateTag).toHaveBeenCalledWith('league-selector')
    })

    it('should reject invalid input', async () => {
      const result = await updateLeagueUserActive({ leagueUserId: 0, value: true })
      expect(result.success).toBe(false)
    })
  })

  describe('updateLeagueUserPaid', () => {
    it('should update paid status', async () => {
      mockPrisma.leagueUser.update.mockResolvedValue({ id: 1, leagueId: 5 } as any)

      const result = await updateLeagueUserPaid({ leagueUserId: 1, value: true })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueUser.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { paid: true, updatedAt: expect.any(Date) },
      })
    })

    it('should reject invalid input', async () => {
      const result = await updateLeagueUserPaid({ leagueUserId: -5, value: false })
      expect(result.success).toBe(false)
    })
  })

  describe('addUserToLeague', () => {
    it('should add user to league', async () => {
      const now = new Date()
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5 } as any)
      mockPrisma.league.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueUser.upsert.mockResolvedValue({ id: 10, createdAt: now } as any)

      const result = await addUserToLeague({ userId: 5, leagueId: 1 })

      expect(result.success).toBe(true)
      expect(mockUpdateTag).toHaveBeenCalledWith('league-selector')
    })

    it('should return error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await addUserToLeague({ userId: 999, leagueId: 1 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('User not found')
    })

    it('should return error when league not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5 } as any)
      mockPrisma.league.findUnique.mockResolvedValue(null)

      const result = await addUserToLeague({ userId: 5, leagueId: 999 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('League not found')
    })

    it('should return error when user already member', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 5 } as any)
      mockPrisma.league.findUnique.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueUser.upsert.mockResolvedValue({ id: 10, createdAt: new Date('2020-01-01') } as any)

      const result = await addUserToLeague({ userId: 5, leagueId: 1 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('already a member')
    })

    it('should reject invalid input', async () => {
      const result = await addUserToLeague({ userId: -1, leagueId: 1 })
      expect(result.success).toBe(false)
    })
  })

  describe('removeLeagueUser', () => {
    it('should soft delete league user', async () => {
      mockPrisma.leagueUser.update.mockResolvedValue({ id: 1, leagueId: 5 } as any)

      const result = await removeLeagueUser({ leagueUserId: 1 })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueUser.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
      expect(mockUpdateTag).toHaveBeenCalledWith('league-selector')
    })

    it('should reject invalid input', async () => {
      const result = await removeLeagueUser({ leagueUserId: 0 })
      expect(result.success).toBe(false)
    })
  })
})
