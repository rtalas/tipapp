import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateLeagueAccess, getActiveLeagues } from './league-utils'
import { prisma } from '@/lib/prisma'
import type { League } from '@prisma/client'

// Mock Next.js redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    league: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe('league-utils', () => {
  const mockLeague: League = {
    id: 123,
    name: 'Test League',
    sportId: 1,
    seasonFrom: 2024,
    seasonTo: 2025,
    isActive: true,
    isPublic: true,
    isTheMostActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateLeagueAccess', () => {
    it('should return league for valid ID', async () => {
      vi.mocked(prisma.league.findFirst).mockResolvedValue(mockLeague)

      const result = await validateLeagueAccess('123')

      expect(result).toEqual(mockLeague)
      expect(prisma.league.findFirst).toHaveBeenCalledWith({
        where: {
          id: 123,
          deletedAt: null,
        },
      })
    })

    it('should call prisma with parsed integer ID', async () => {
      vi.mocked(prisma.league.findFirst).mockResolvedValue(mockLeague)

      await validateLeagueAccess('456')

      expect(prisma.league.findFirst).toHaveBeenCalledWith({
        where: {
          id: 456,
          deletedAt: null,
        },
      })
    })

    it('should redirect if league ID is not a number', async () => {
      await expect(validateLeagueAccess('invalid')).rejects.toThrow('NEXT_REDIRECT:/admin/leagues')

      // Prisma should not be called
      expect(prisma.league.findFirst).not.toHaveBeenCalled()
    })

    it('should redirect if league ID is empty string', async () => {
      await expect(validateLeagueAccess('')).rejects.toThrow('NEXT_REDIRECT:/admin/leagues')

      expect(prisma.league.findFirst).not.toHaveBeenCalled()
    })

    it('should parse alphanumeric ID as integer (parseInt behavior)', async () => {
      // parseInt('123abc', 10) returns 123 - it parses until non-numeric character
      vi.mocked(prisma.league.findFirst).mockResolvedValue(mockLeague)

      const result = await validateLeagueAccess('123abc')

      expect(result).toEqual(mockLeague)
      expect(prisma.league.findFirst).toHaveBeenCalledWith({
        where: {
          id: 123, // Parses to 123, ignores 'abc'
          deletedAt: null,
        },
      })
    })

    it('should redirect if league not found', async () => {
      vi.mocked(prisma.league.findFirst).mockResolvedValue(null)

      await expect(validateLeagueAccess('999')).rejects.toThrow('NEXT_REDIRECT:/admin/leagues')
    })

    it('should redirect if league is soft deleted', async () => {
      const deletedLeague = {
        ...mockLeague,
        deletedAt: new Date('2024-06-01'),
      }
      vi.mocked(prisma.league.findFirst).mockResolvedValue(deletedLeague)

      // findFirst will return null because of deletedAt filter
      vi.mocked(prisma.league.findFirst).mockResolvedValue(null)

      await expect(validateLeagueAccess('123')).rejects.toThrow('NEXT_REDIRECT:/admin/leagues')
    })

    it('should handle string numbers with leading zeros', async () => {
      vi.mocked(prisma.league.findFirst).mockResolvedValue(mockLeague)

      const result = await validateLeagueAccess('00123')

      expect(result).toEqual(mockLeague)
      expect(prisma.league.findFirst).toHaveBeenCalledWith({
        where: {
          id: 123, // Leading zeros stripped
          deletedAt: null,
        },
      })
    })

    it('should handle negative ID strings (redirects on NaN check)', async () => {
      // parseInt('-123', 10) returns -123 which is valid
      vi.mocked(prisma.league.findFirst).mockResolvedValue(null)

      await expect(validateLeagueAccess('-123')).rejects.toThrow('NEXT_REDIRECT:/admin/leagues')
    })

    it('should handle decimal ID strings (parses to integer)', async () => {
      // parseInt('123.456', 10) returns 123
      vi.mocked(prisma.league.findFirst).mockResolvedValue(mockLeague)

      const result = await validateLeagueAccess('123.456')

      expect(prisma.league.findFirst).toHaveBeenCalledWith({
        where: {
          id: 123,
          deletedAt: null,
        },
      })
    })
  })

  describe('getActiveLeagues', () => {
    it('should return active leagues ordered by seasonFrom desc', async () => {
      const leagues: League[] = [
        {
          ...mockLeague,
          id: 1,
          seasonFrom: 2024,
          seasonTo: 2025,
        },
        {
          ...mockLeague,
          id: 2,
          seasonFrom: 2023,
          seasonTo: 2024,
        },
      ]

      vi.mocked(prisma.league.findMany).mockResolvedValue(leagues)

      const result = await getActiveLeagues()

      expect(result).toEqual(leagues)
      expect(prisma.league.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          deletedAt: null,
        },
        orderBy: { seasonFrom: 'desc' },
      })
    })

    it('should filter out inactive leagues', async () => {
      const result = await getActiveLeagues()

      expect(prisma.league.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true,
        }),
        orderBy: expect.any(Object),
      })
    })

    it('should filter out soft deleted leagues', async () => {
      const result = await getActiveLeagues()

      expect(prisma.league.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deletedAt: null,
        }),
        orderBy: expect.any(Object),
      })
    })

    it('should return empty array if no active leagues', async () => {
      vi.mocked(prisma.league.findMany).mockResolvedValue([])

      const result = await getActiveLeagues()

      expect(result).toEqual([])
    })

    it('should return all active leagues regardless of isPublic', async () => {
      const leagues: League[] = [
        { ...mockLeague, id: 1, isPublic: true },
        { ...mockLeague, id: 2, isPublic: false },
      ]

      vi.mocked(prisma.league.findMany).mockResolvedValue(leagues)

      const result = await getActiveLeagues()

      // Both public and private leagues should be returned
      expect(result).toHaveLength(2)
    })

    it('should return all active leagues regardless of isTheMostActive', async () => {
      const leagues: League[] = [
        { ...mockLeague, id: 1, isTheMostActive: true },
        { ...mockLeague, id: 2, isTheMostActive: false },
      ]

      vi.mocked(prisma.league.findMany).mockResolvedValue(leagues)

      const result = await getActiveLeagues()

      // Both most active and non-most-active leagues should be returned
      expect(result).toHaveLength(2)
    })
  })

  describe('integration scenarios', () => {
    it('should validate league and use it for access control', async () => {
      vi.mocked(prisma.league.findFirst).mockResolvedValue(mockLeague)

      const league = await validateLeagueAccess('123')

      // Verify league can be used for further logic
      expect(league.id).toBe(123)
      expect(league.isActive).toBe(true)
      expect(league.deletedAt).toBeNull()
    })

    it('should get active leagues and validate one of them', async () => {
      const leagues: League[] = [mockLeague]

      vi.mocked(prisma.league.findMany).mockResolvedValue(leagues)
      vi.mocked(prisma.league.findFirst).mockResolvedValue(mockLeague)

      // Get active leagues
      const activeLeagues = await getActiveLeagues()
      expect(activeLeagues).toHaveLength(1)

      // Validate one of them
      const validatedLeague = await validateLeagueAccess(activeLeagues[0].id.toString())
      expect(validatedLeague.id).toBe(mockLeague.id)
    })
  })
})
