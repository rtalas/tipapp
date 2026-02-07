import { describe, it, expect, beforeEach, vi } from 'vitest'
import { evaluateMatchAtomic } from './match-evaluator'
import { prisma } from '@/lib/prisma'

// Mock scorer ranking lookup (used by buildMatchBetContext)
vi.mock('@/lib/scorer-ranking-utils', () => ({
  getScorerRankingAtTime: vi.fn().mockResolvedValue(null),
}))

import { getScorerRankingAtTime } from '@/lib/scorer-ranking-utils'

describe('Match Evaluator', () => {
  const mockTx = {
    leagueMatch: {
      findUniqueOrThrow: vi.fn(),
    },
    userBet: {
      update: vi.fn(),
    },
    match: {
      update: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(prisma.$transaction).mockImplementation(
      (async <T>(callback: (tx: typeof mockTx) => Promise<T>) => {
        return await callback(mockTx)
      }) as any
    )

    mockTx.userBet.update.mockResolvedValue({})
    mockTx.match.update.mockResolvedValue({})
  })

  function makeLeagueMatch(overrides: Record<string, unknown> = {}) {
    return {
      id: 100,
      isDoubled: false,
      Match: {
        id: 1,
        dateTime: new Date('2026-01-15T18:00:00Z'),
        homeRegularScore: 2,
        awayRegularScore: 1,
        homeFinalScore: 2,
        awayFinalScore: 1,
        isOvertime: false,
        isShootout: false,
        isPlayoffGame: false,
        homeAdvanced: null,
        MatchScorer: [{ scorerId: 10, numberOfGoals: 1 }],
        ...((overrides.Match as Record<string, unknown>) ?? {}),
      },
      League: {
        Evaluator: [
          {
            id: 1,
            points: 5,
            config: null,
            EvaluatorType: { name: 'winner' },
          },
        ],
        ...((overrides.League as Record<string, unknown>) ?? {}),
      },
      UserBet: [
        {
          id: 1,
          homeScore: 2,
          awayScore: 1,
          scorerId: null,
          noScorer: null,
          overtime: false,
          homeAdvanced: null,
          LeagueUser: { userId: 1, User: { id: 1 } },
        },
      ],
      ...Object.fromEntries(
        Object.entries(overrides).filter(
          ([k]) => !['Match', 'League'].includes(k)
        )
      ),
    }
  }

  describe('Basic Evaluation', () => {
    it('should award points when evaluator returns true', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(makeLeagueMatch())

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].userId).toBe(1)
      expect(result.results[0].totalPoints).toBe(5)
      expect(result.results[0].evaluatorResults[0]).toEqual({
        evaluatorName: 'winner',
        awarded: true,
        points: 5,
      })
    })

    it('should award zero points when evaluator returns false', async () => {
      // User predicted home win (3-0) but away won (0-2)
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: 0,
            awayRegularScore: 2,
            homeFinalScore: 0,
            awayFinalScore: 2,
            MatchScorer: [],
          },
          UserBet: [
            {
              id: 1,
              homeScore: 3,
              awayScore: 0,
              scorerId: null,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results[0].totalPoints).toBe(0)
      expect(result.results[0].evaluatorResults[0].awarded).toBe(false)
    })
  })

  describe('Multiple Evaluators', () => {
    it('should sum points across multiple evaluators', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: 2,
            awayRegularScore: 1,
            homeFinalScore: 2,
            awayFinalScore: 1,
            MatchScorer: [],
          },
          League: {
            Evaluator: [
              {
                id: 1,
                points: 5,
                config: null,
                EvaluatorType: { name: 'winner' },
              },
              {
                id: 2,
                points: 10,
                config: null,
                EvaluatorType: { name: 'exact_score' },
              },
              {
                id: 3,
                points: 3,
                config: null,
                EvaluatorType: { name: 'score_difference' },
              },
            ],
          },
          // User predicted exactly 2-1
          UserBet: [
            {
              id: 1,
              homeScore: 2,
              awayScore: 1,
              scorerId: null,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      // exact_score = 10, winner = 5, score_difference excluded by exact_score evaluator = 0
      // exact_score awards true, winner awards true, score_difference returns false (excluded when exact)
      expect(result.results[0].evaluatorResults).toHaveLength(3)
      expect(result.results[0].totalPoints).toBe(15) // winner(5) + exact_score(10) + score_diff(0, excluded by exact)
    })
  })

  describe('Multiple Users', () => {
    it('should evaluate all users independently', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: 2,
            awayRegularScore: 1,
            homeFinalScore: 2,
            awayFinalScore: 1,
            MatchScorer: [],
          },
          UserBet: [
            {
              id: 1,
              homeScore: 2,
              awayScore: 1, // Correct winner
              scorerId: null,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
            {
              id: 2,
              homeScore: 0,
              awayScore: 3, // Wrong winner
              scorerId: null,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 2, User: { id: 2 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results).toHaveLength(2)
      expect(result.totalUsersEvaluated).toBe(2)

      // User 1: correct winner
      expect(result.results[0].userId).toBe(1)
      expect(result.results[0].totalPoints).toBe(5)

      // User 2: wrong winner
      expect(result.results[1].userId).toBe(2)
      expect(result.results[1].totalPoints).toBe(0)

      expect(mockTx.userBet.update).toHaveBeenCalledTimes(2)
    })
  })

  describe('isDoubled Multiplier', () => {
    it('should double points when isDoubled is true', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({ isDoubled: true })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results[0].totalPoints).toBe(10) // 5 * 2
      expect(result.results[0].evaluatorResults[0].points).toBe(10)
    })

    it('should not double points when isDoubled is false', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({ isDoubled: false })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results[0].totalPoints).toBe(5)
    })
  })

  describe('Scorer with Rank-Based Config', () => {
    it('should use config-based points for scorer with rank config', async () => {
      vi.mocked(getScorerRankingAtTime).mockResolvedValue(2) // Rank 2

      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: 1,
            awayRegularScore: 0,
            homeFinalScore: 1,
            awayFinalScore: 0,
            MatchScorer: [{ scorerId: 10, numberOfGoals: 1 }],
          },
          League: {
            Evaluator: [
              {
                id: 1,
                points: 0, // Points field ignored when config exists
                config: {
                  rankedPoints: { '1': 2, '2': 4, '3': 5 },
                  unrankedPoints: 8,
                },
                EvaluatorType: { name: 'scorer' },
              },
            ],
          },
          UserBet: [
            {
              id: 1,
              homeScore: 1,
              awayScore: 0,
              scorerId: 10, // Correct scorer
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      // Scorer has rank 2 → 4 points from config
      expect(result.results[0].totalPoints).toBe(4)
      expect(result.results[0].evaluatorResults[0].points).toBe(4)
      expect(result.results[0].evaluatorResults[0].awarded).toBe(true)
    })

    it('should use unrankedPoints when scorer has no ranking', async () => {
      vi.mocked(getScorerRankingAtTime).mockResolvedValue(null) // No ranking

      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: 1,
            awayRegularScore: 0,
            homeFinalScore: 1,
            awayFinalScore: 0,
            MatchScorer: [{ scorerId: 10, numberOfGoals: 1 }],
          },
          League: {
            Evaluator: [
              {
                id: 1,
                points: 0,
                config: {
                  rankedPoints: { '1': 2, '2': 4 },
                  unrankedPoints: 8,
                },
                EvaluatorType: { name: 'scorer' },
              },
            ],
          },
          UserBet: [
            {
              id: 1,
              homeScore: 1,
              awayScore: 0,
              scorerId: 10,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results[0].totalPoints).toBe(8)
    })

    it('should use boolean mode for scorer without config', async () => {
      vi.mocked(getScorerRankingAtTime).mockResolvedValue(null)

      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: 1,
            awayRegularScore: 0,
            homeFinalScore: 1,
            awayFinalScore: 0,
            MatchScorer: [{ scorerId: 10, numberOfGoals: 1 }],
          },
          League: {
            Evaluator: [
              {
                id: 1,
                points: 3,
                config: null, // No config = simple boolean mode
                EvaluatorType: { name: 'scorer' },
              },
            ],
          },
          UserBet: [
            {
              id: 1,
              homeScore: 1,
              awayScore: 0,
              scorerId: 10,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results[0].totalPoints).toBe(3)
      expect(result.results[0].evaluatorResults[0].awarded).toBe(true)
    })

    it('should double rank-based scorer points when isDoubled', async () => {
      vi.mocked(getScorerRankingAtTime).mockResolvedValue(1)

      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          isDoubled: true,
          Match: {
            homeRegularScore: 1,
            awayRegularScore: 0,
            homeFinalScore: 1,
            awayFinalScore: 0,
            MatchScorer: [{ scorerId: 10, numberOfGoals: 1 }],
          },
          League: {
            Evaluator: [
              {
                id: 1,
                points: 0,
                config: {
                  rankedPoints: { '1': 2, '2': 4 },
                  unrankedPoints: 8,
                },
                EvaluatorType: { name: 'scorer' },
              },
            ],
          },
          UserBet: [
            {
              id: 1,
              homeScore: 1,
              awayScore: 0,
              scorerId: 10,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      // Rank 1 = 2 points, doubled = 4
      expect(result.results[0].totalPoints).toBe(4)
    })
  })

  describe('Unknown Evaluators', () => {
    it('should skip unknown evaluator types', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          League: {
            Evaluator: [
              {
                id: 1,
                points: 5,
                config: null,
                EvaluatorType: { name: 'winner' },
              },
              {
                id: 2,
                points: 10,
                config: null,
                EvaluatorType: { name: 'nonexistent_evaluator' },
              },
            ],
          },
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      // Only winner evaluator should produce a result
      expect(result.results[0].evaluatorResults).toHaveLength(1)
      expect(result.results[0].totalPoints).toBe(5)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unknown evaluator type: nonexistent_evaluator'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Match Marked as Evaluated', () => {
    it('should mark match as evaluated after full evaluation', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(makeLeagueMatch())

      await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })

      expect(mockTx.match.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            isEvaluated: true,
          }),
        })
      )
    })

    it('should NOT mark match as evaluated when evaluating single user', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(makeLeagueMatch())

      await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
        userId: 1,
      })

      expect(mockTx.match.update).not.toHaveBeenCalled()
    })
  })

  describe('DB Updates', () => {
    it('should update userBet with totalPoints', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(makeLeagueMatch())

      await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })

      expect(mockTx.userBet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            totalPoints: 5,
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should throw when match has no results', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: null,
            awayRegularScore: null,
            MatchScorer: [],
          },
        })
      )

      await expect(
        evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      ).rejects.toThrow('Cannot evaluate match without results')
    })

    it('should throw when no evaluators configured', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          League: { Evaluator: [] },
        })
      )

      await expect(
        evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      ).rejects.toThrow('No evaluators configured for this league')
    })
  })

  describe('Transaction Isolation', () => {
    it('should execute in Serializable transaction', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(makeLeagueMatch())

      await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      )
    })
  })

  describe('No User Bets', () => {
    it('should return empty results when no users have bets', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({ UserBet: [] })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results).toHaveLength(0)
      expect(result.totalUsersEvaluated).toBe(0)
      expect(mockTx.userBet.update).not.toHaveBeenCalled()
    })
  })
})
