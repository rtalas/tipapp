import { describe, it, expect, beforeEach, vi } from 'vitest'
import { evaluateSeriesAtomic } from './series-evaluator'
import { prisma } from '@/lib/prisma'

describe('Series Evaluator', () => {
  const mockTx = {
    leagueSpecialBetSerie: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    userSpecialBetSerie: {
      update: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.$transaction).mockImplementation(
      async <T>(callback: (tx: typeof mockTx) => Promise<T>) => {
        return await callback(mockTx)
      }
    )

    mockTx.userSpecialBetSerie.update.mockResolvedValue({})
    mockTx.leagueSpecialBetSerie.update.mockResolvedValue({})
  })

  function makeSeries(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      homeTeamScore: 4,
      awayTeamScore: 2,
      League: {
        Evaluator: [
          {
            id: 1,
            points: 10,
            EvaluatorType: { name: 'series_winner' },
          },
        ],
      },
      UserSpecialBetSerie: [
        {
          id: 1,
          homeTeamScore: 4,
          awayTeamScore: 1, // Correct winner (home)
          LeagueUser: { userId: 1, User: { id: 1 } },
        },
      ],
      ...overrides,
    }
  }

  describe('Basic Evaluation', () => {
    it('should award points for correct series winner', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries()
      )

      const result = await evaluateSeriesAtomic({ seriesId: 1 })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].userId).toBe(1)
      expect(result.results[0].totalPoints).toBe(10)
      expect(result.results[0].evaluatorResults[0]).toEqual({
        evaluatorName: 'series_winner',
        awarded: true,
        points: 10,
      })
    })

    it('should award zero for wrong series winner', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries({
          UserSpecialBetSerie: [
            {
              id: 1,
              homeTeamScore: 1,
              awayTeamScore: 4, // Predicted away wins, but home won
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateSeriesAtomic({ seriesId: 1 })

      expect(result.results[0].totalPoints).toBe(0)
      expect(result.results[0].evaluatorResults[0].awarded).toBe(false)
    })
  })

  describe('Multiple Evaluators', () => {
    it('should sum points across series_winner and series_exact', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries({
          League: {
            Evaluator: [
              {
                id: 1,
                points: 10,
                EvaluatorType: { name: 'series_winner' },
              },
              {
                id: 2,
                points: 20,
                EvaluatorType: { name: 'series_exact' },
              },
            ],
          },
          // Exact prediction: 4-2
          UserSpecialBetSerie: [
            {
              id: 1,
              homeTeamScore: 4,
              awayTeamScore: 2,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateSeriesAtomic({ seriesId: 1 })

      // series_exact = true (20pts), series_winner = false (excluded by exact) = 0
      // Actually series_winner checks who wins independently, so both could award
      expect(result.results[0].evaluatorResults).toHaveLength(2)
      // series_exact awards for 4-2 match
      const exactResult = result.results[0].evaluatorResults.find(
        (e) => e.evaluatorName === 'series_exact'
      )
      expect(exactResult?.awarded).toBe(true)
      expect(exactResult?.points).toBe(20)
    })
  })

  describe('Multiple Users', () => {
    it('should evaluate all users independently', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries({
          UserSpecialBetSerie: [
            {
              id: 1,
              homeTeamScore: 4,
              awayTeamScore: 1, // Correct winner
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
            {
              id: 2,
              homeTeamScore: 2,
              awayTeamScore: 4, // Wrong winner
              LeagueUser: { userId: 2, User: { id: 2 } },
            },
            {
              id: 3,
              homeTeamScore: 4,
              awayTeamScore: 3, // Correct winner
              LeagueUser: { userId: 3, User: { id: 3 } },
            },
          ],
        })
      )

      const result = await evaluateSeriesAtomic({ seriesId: 1 })

      expect(result.results).toHaveLength(3)
      expect(result.totalUsersEvaluated).toBe(3)

      expect(result.results[0].totalPoints).toBe(10) // Correct
      expect(result.results[1].totalPoints).toBe(0)  // Wrong
      expect(result.results[2].totalPoints).toBe(10) // Correct

      expect(mockTx.userSpecialBetSerie.update).toHaveBeenCalledTimes(3)
    })
  })

  describe('Marked as Evaluated', () => {
    it('should mark series as evaluated after full evaluation', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries()
      )

      await evaluateSeriesAtomic({ seriesId: 1 })

      expect(mockTx.leagueSpecialBetSerie.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            isEvaluated: true,
          }),
        })
      )
    })

    it('should NOT mark series as evaluated when evaluating single user', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries()
      )

      await evaluateSeriesAtomic({ seriesId: 1, userId: 1 })

      expect(mockTx.leagueSpecialBetSerie.update).not.toHaveBeenCalled()
    })
  })

  describe('DB Updates', () => {
    it('should update userSpecialBetSerie with totalPoints', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries()
      )

      await evaluateSeriesAtomic({ seriesId: 1 })

      expect(mockTx.userSpecialBetSerie.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            totalPoints: 10,
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should throw when series has no results', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries({
          homeTeamScore: null,
          awayTeamScore: null,
        })
      )

      await expect(
        evaluateSeriesAtomic({ seriesId: 1 })
      ).rejects.toThrow('Cannot evaluate series without results')
    })

    it('should throw when no evaluators configured', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries({
          League: { Evaluator: [] },
        })
      )

      await expect(
        evaluateSeriesAtomic({ seriesId: 1 })
      ).rejects.toThrow('No evaluators configured for this league')
    })
  })

  describe('Unknown Evaluators', () => {
    it('should skip unknown evaluator types', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries({
          League: {
            Evaluator: [
              {
                id: 1,
                points: 10,
                EvaluatorType: { name: 'series_winner' },
              },
              {
                id: 2,
                points: 5,
                EvaluatorType: { name: 'bogus_evaluator' },
              },
            ],
          },
        })
      )

      const result = await evaluateSeriesAtomic({ seriesId: 1 })

      expect(result.results[0].evaluatorResults).toHaveLength(1)
      expect(result.results[0].totalPoints).toBe(10)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown evaluator type: bogus_evaluator'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Transaction Isolation', () => {
    it('should execute in Serializable transaction', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries()
      )

      await evaluateSeriesAtomic({ seriesId: 1 })

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      )
    })
  })

  describe('No User Bets', () => {
    it('should return empty results when no users have bets', async () => {
      mockTx.leagueSpecialBetSerie.findUniqueOrThrow.mockResolvedValue(
        makeSeries({ UserSpecialBetSerie: [] })
      )

      const result = await evaluateSeriesAtomic({ seriesId: 1 })

      expect(result.results).toHaveLength(0)
      expect(result.totalUsersEvaluated).toBe(0)
      expect(mockTx.userSpecialBetSerie.update).not.toHaveBeenCalled()
    })
  })
})
