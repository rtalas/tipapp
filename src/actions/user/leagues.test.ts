import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllLeaguesForSelector, joinLeague } from './leagues'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidateTag } from 'next/cache'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockAuth = vi.mocked(auth)
const mockRevalidateTag = vi.mocked(revalidateTag)

const mockSession = { user: { id: '5', isSuperadmin: false } }

describe('User Leagues Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(mockSession as any)
  })

  describe('getAllLeaguesForSelector', () => {
    it('should return leagues for authenticated user', async () => {
      // unstable_cache is mocked to pass-through, so prisma calls happen directly
      mockPrisma.leagueUser.findMany
        .mockResolvedValueOnce([]) // user leagues
        .mockResolvedValueOnce([]) // past leagues
      mockPrisma.league.findMany.mockResolvedValue([]) // available leagues

      const result = await getAllLeaguesForSelector()

      expect(result.userLeagues).toEqual([])
      expect(result.pastLeagues).toEqual([])
      expect(result.availableLeagues).toEqual([])
    })

    it('should throw when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      await expect(getAllLeaguesForSelector()).rejects.toThrow()
    })
  })

  describe('joinLeague', () => {
    const setupTransaction = (findFirstResult: unknown, createResult?: unknown) => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          leagueUser: {
            findFirst: vi.fn().mockResolvedValue(findFirstResult),
            create: vi.fn().mockResolvedValue(createResult ?? { id: 10 }),
          },
        }
        return fn(tx)
      })
    }

    it('should join a public active league using Serializable transaction', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isPublic: true,
        isActive: true,
      } as any)
      setupTransaction(null, { id: 10 })

      const result = await joinLeague(1)

      expect(result.success).toBe(true)
      expect(result.leagueId).toBe(1)
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          isolationLevel: 'Serializable',
          maxWait: 5000,
          timeout: 10000,
        }
      )
      expect(mockRevalidateTag).toHaveBeenCalledWith('league-selector', 'max')
      expect(mockRevalidateTag).toHaveBeenCalledWith('leaderboard', 'max')
    })

    it('should throw when league not found', async () => {
      mockPrisma.league.findUnique.mockResolvedValue(null)

      await expect(joinLeague(999)).rejects.toThrow('League not found')
    })

    it('should throw when league is private', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isPublic: false,
        isActive: true,
      } as any)

      await expect(joinLeague(1)).rejects.toThrow('private')
    })

    it('should throw when league is not active', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isPublic: true,
        isActive: false,
      } as any)

      await expect(joinLeague(1)).rejects.toThrow('not active')
    })

    it('should throw when already a member', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isPublic: true,
        isActive: true,
      } as any)
      setupTransaction({ id: 10 })

      await expect(joinLeague(1)).rejects.toThrow('Already a member')
    })

    it('should throw when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      await expect(joinLeague(1)).rejects.toThrow()
    })

    it('should handle transaction failure', async () => {
      mockPrisma.league.findUnique.mockResolvedValue({
        id: 1,
        isPublic: true,
        isActive: true,
      } as any)
      mockPrisma.$transaction.mockRejectedValue(new Error('Serialization failure'))

      await expect(joinLeague(1)).rejects.toThrow('Serialization failure')
    })
  })
})
