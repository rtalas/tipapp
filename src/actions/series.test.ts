import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSeries, updateSeriesResult, deleteSeries } from './series'
import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/auth-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockRevalidateTag = vi.mocked(revalidateTag)
const mockRequireAdmin = vi.mocked(requireAdmin)

describe('Series Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSeries', () => {
    it('should create series when teams belong to league', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce({ id: 1, leagueId: 1 } as any) // home team
        .mockResolvedValueOnce({ id: 2, leagueId: 1 } as any) // away team
      mockPrisma.specialBetSerie.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetSerie.create.mockResolvedValue({ id: 10 } as any)

      const result = await createSeries({
        leagueId: 1,
        specialBetSerieId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
      })

      expect(mockRequireAdmin).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect((result as any).seriesId).toBe(10)
    })

    it('should return error when home team not in league', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce(null) // home not found
        .mockResolvedValueOnce({ id: 2 } as any)

      const result = await createSeries({
        leagueId: 1,
        specialBetSerieId: 1,
        homeTeamId: 99,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Teams must belong')
    })

    it('should return error when away team not in league', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce(null)

      const result = await createSeries({
        leagueId: 1,
        specialBetSerieId: 1,
        homeTeamId: 1,
        awayTeamId: 99,
        dateTime: new Date('2026-06-01'),
      })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Teams must belong')
    })

    it('should invalidate series-data cache', async () => {
      mockPrisma.leagueTeam.findFirst
        .mockResolvedValueOnce({ id: 1 } as any)
        .mockResolvedValueOnce({ id: 2 } as any)
      mockPrisma.specialBetSerie.findFirst.mockResolvedValue({ id: 1 } as any)
      mockPrisma.leagueSpecialBetSerie.create.mockResolvedValue({ id: 1 } as any)

      await createSeries({
        leagueId: 1,
        specialBetSerieId: 1,
        homeTeamId: 1,
        awayTeamId: 2,
        dateTime: new Date('2026-06-01'),
      })

      expect(mockRevalidateTag).toHaveBeenCalledWith('series-data', 'max')
    })
  })

  describe('updateSeriesResult', () => {
    it('should update series scores', async () => {
      mockPrisma.leagueSpecialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      const result = await updateSeriesResult({
        seriesId: 1,
        homeTeamScore: 4,
        awayTeamScore: 2,
      })

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueSpecialBetSerie.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ homeTeamScore: 4, awayTeamScore: 2 }),
        })
      )
    })

    it('should invalidate series-data cache', async () => {
      mockPrisma.leagueSpecialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      await updateSeriesResult({ seriesId: 1, homeTeamScore: 4, awayTeamScore: 1 })

      expect(mockRevalidateTag).toHaveBeenCalledWith('series-data', 'max')
    })
  })

  describe('deleteSeries', () => {
    it('should soft delete series', async () => {
      mockPrisma.leagueSpecialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteSeries(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueSpecialBetSerie.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      })
    })

    it('should invalidate series-data cache', async () => {
      mockPrisma.leagueSpecialBetSerie.update.mockResolvedValue({ id: 1 } as any)

      await deleteSeries(1)

      expect(mockRevalidateTag).toHaveBeenCalledWith('series-data', 'max')
    })

    it('should reject invalid id', async () => {
      const result = await deleteSeries(-1)

      expect(result.success).toBe(false)
    })
  })
})
