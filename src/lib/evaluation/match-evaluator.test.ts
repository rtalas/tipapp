import { describe, it, expect, beforeEach, vi } from 'vitest'
import { evaluateMatchAtomic } from './match-evaluator'
import { prisma } from '@/lib/prisma'

// Mock scorer ranking lookup (used by match evaluator for batch fetch)
vi.mock('@/lib/scorer-ranking-utils', () => ({
  getLeagueRankingsAtTime: vi.fn().mockResolvedValue(new Map()),
}))

import { getLeagueRankingsAtTime } from '@/lib/scorer-ranking-utils'

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
        id: 1,
        sportId: 1, // Hockey by default
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

    it('should double points when usedJoker is true on the user bet', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          isDoubled: false,
          UserBet: [
            {
              id: 1,
              homeScore: 2,
              awayScore: 1,
              scorerId: null,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              usedJoker: true,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results[0].totalPoints).toBe(10) // 5 * 2 via joker
    })

    it('should still double only once when isDoubled and usedJoker both true', async () => {
      // Defensive: save flow blocks this combo, but evaluator should not 4x.
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          isDoubled: true,
          UserBet: [
            {
              id: 1,
              homeScore: 2,
              awayScore: 1,
              scorerId: null,
              noScorer: null,
              overtime: false,
              homeAdvanced: null,
              usedJoker: true,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateMatchAtomic({
        matchId: 1,
        leagueMatchId: 100,
      })

      expect(result.results[0].totalPoints).toBe(10) // 5 * 2, not 5 * 4
    })
  })

  describe('Scorer with Rank-Based Config', () => {
    it('should use config-based points for scorer with rank config', async () => {
      vi.mocked(getLeagueRankingsAtTime).mockResolvedValue(new Map([[10, 2]])) // Scorer 10 = Rank 2

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
      vi.mocked(getLeagueRankingsAtTime).mockResolvedValue(new Map()) // No rankings

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
      vi.mocked(getLeagueRankingsAtTime).mockResolvedValue(new Map())

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
      vi.mocked(getLeagueRankingsAtTime).mockResolvedValue(new Map([[10, 1]])) // Scorer 10 = Rank 1

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

  describe('Football scoring (sportId=2, no exclusions)', () => {
    const footballEvaluators = [
      { id: 1, points: 3, config: null, EvaluatorType: { name: 'exact_score' } },
      { id: 2, points: 1, config: null, EvaluatorType: { name: 'score_difference' } },
      { id: 3, points: 3, config: null, EvaluatorType: { name: 'winner' } },
      { id: 4, points: 3, config: null, EvaluatorType: { name: 'draw' } },
    ]

    function footballMatch(
      home: number,
      away: number,
      bet: { homeScore: number; awayScore: number }
    ) {
      return makeLeagueMatch({
        Match: {
          homeRegularScore: home,
          awayRegularScore: away,
          homeFinalScore: home,
          awayFinalScore: away,
          MatchScorer: [],
        },
        League: { sportId: 2, Evaluator: footballEvaluators },
        UserBet: [
          {
            id: 1,
            homeScore: bet.homeScore,
            awayScore: bet.awayScore,
            scorerId: null,
            noScorer: null,
            overtime: false,
            homeAdvanced: null,
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
        ],
      })
    }

    it('awards 3 points for just winner (tip 2:1 → actual 4:1)', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        footballMatch(4, 1, { homeScore: 2, awayScore: 1 })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      expect(result.results[0].totalPoints).toBe(3) // winner only
    })

    it('awards 3 points (no one_team bonus) for tip 5:0 → actual 5:1', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        footballMatch(5, 1, { homeScore: 5, awayScore: 0 })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // Football has no one_team_score evaluator and no exclusions:
      // winner(3) + score_diff(0, diff 5 vs 4) + exact(0) = 3
      expect(result.results[0].totalPoints).toBe(3)
    })

    it('awards 4 points for winner + same goal difference (tip 3:1 → actual 4:2)', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        footballMatch(4, 2, { homeScore: 3, awayScore: 1 })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      expect(result.results[0].totalPoints).toBe(4) // winner(3) + score_diff(1)
    })

    it('awards 7 points for exact non-draw (tip 3:1 → actual 3:1)', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        footballMatch(3, 1, { homeScore: 3, awayScore: 1 })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // Critical: football has NO exclusion, so all three stack.
      expect(result.results[0].totalPoints).toBe(7) // winner(3) + score_diff(1) + exact(3)
    })

    it('awards 4 points for correct draw (tip 0:0 → actual 1:1)', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        footballMatch(1, 1, { homeScore: 0, awayScore: 0 })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // winner is strict non-draw → ✗; draw fires; score_diff matches (0==0); not exact.
      expect(result.results[0].totalPoints).toBe(4) // draw(3) + score_diff(1)
    })

    it('awards 7 points for exact draw (tip 1:1 → actual 1:1)', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        footballMatch(1, 1, { homeScore: 1, awayScore: 1 })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // Strict winner ✗ (draw), draw ✓, score_diff ✓, exact ✓
      expect(result.results[0].totalPoints).toBe(7) // draw(3) + score_diff(1) + exact(3)
    })

    it('awards 0 points for wrong winner (tip 3:1 → actual 2:4)', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        footballMatch(2, 4, { homeScore: 3, awayScore: 1 })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      expect(result.results[0].totalPoints).toBe(0)
    })
  })

  describe('Football playoff (regulation-based scoring, ignores OT/SO)', () => {
    const footballPlayoffEvaluators = [
      { id: 1, points: 3, config: null, EvaluatorType: { name: 'exact_score' } },
      { id: 2, points: 1, config: null, EvaluatorType: { name: 'score_difference' } },
      { id: 3, points: 3, config: null, EvaluatorType: { name: 'winner' } },
      { id: 4, points: 3, config: null, EvaluatorType: { name: 'draw' } },
      { id: 5, points: 3, config: null, EvaluatorType: { name: 'soccer_playoff_advance' } },
    ]

    function playoffMatch(args: {
      reg: [number, number]
      final: [number, number]
      isOvertime: boolean
      isShootout: boolean
      homeAdvanced: boolean
      bet: { homeScore: number; awayScore: number; homeAdvanced: boolean }
    }) {
      return makeLeagueMatch({
        Match: {
          homeRegularScore: args.reg[0],
          awayRegularScore: args.reg[1],
          homeFinalScore: args.final[0],
          awayFinalScore: args.final[1],
          isOvertime: args.isOvertime,
          isShootout: args.isShootout,
          isPlayoffGame: true,
          homeAdvanced: args.homeAdvanced,
          MatchScorer: [],
        },
        League: { sportId: 2, Evaluator: footballPlayoffEvaluators },
        UserBet: [
          {
            id: 1,
            homeScore: args.bet.homeScore,
            awayScore: args.bet.awayScore,
            scorerId: null,
            noScorer: null,
            overtime: false,
            homeAdvanced: args.bet.homeAdvanced,
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
        ],
      })
    }

    it('F10: decided in regulation — tip 3:1 + home advance, actual 3:1 → 10 b', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        playoffMatch({
          reg: [3, 1],
          final: [3, 1],
          isOvertime: false,
          isShootout: false,
          homeAdvanced: true,
          bet: { homeScore: 3, awayScore: 1, homeAdvanced: true },
        })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      expect(result.results[0].totalPoints).toBe(10) // exact(3)+score_diff(1)+winner(3)+advance(3)
    })

    it('F13: decided in extra time — tip 1:1 + home, actual reg 1:1 → final 2:1 OT → 10 b', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        playoffMatch({
          reg: [1, 1],
          final: [2, 1],
          isOvertime: true,
          isShootout: false,
          homeAdvanced: true,
          bet: { homeScore: 1, awayScore: 1, homeAdvanced: true },
        })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // Football: regulation 1:1 vs predicted 1:1 → exact ✓, score_diff ✓.
      // Strict winner ✗ (draw); draw ✓; advance ✓.
      // exact(3) + score_diff(1) + draw(3) + advance(3)
      expect(result.results[0].totalPoints).toBe(10)
    })

    it('F14: decided on penalties — tip 0:0 + home, actual reg 0:0, final 0:0 SO → 10 b', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        playoffMatch({
          reg: [0, 0],
          final: [0, 0],
          isOvertime: true,
          isShootout: true,
          homeAdvanced: true,
          bet: { homeScore: 0, awayScore: 0, homeAdvanced: true },
        })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      expect(result.results[0].totalPoints).toBe(10)
    })

    it('F15: tip exact reg 2:2 + home, actual reg 2:2 → final 3:2 OT → 10 b', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        playoffMatch({
          reg: [2, 2],
          final: [3, 2],
          isOvertime: true,
          isShootout: false,
          homeAdvanced: true,
          bet: { homeScore: 2, awayScore: 2, homeAdvanced: true },
        })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      expect(result.results[0].totalPoints).toBe(10)
    })

    it('tip 1:1 + home but actual reg was 0:0 → draw + diff + advance → 7 b', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        playoffMatch({
          reg: [0, 0],
          final: [1, 0],
          isOvertime: true,
          isShootout: false,
          homeAdvanced: true,
          bet: { homeScore: 1, awayScore: 1, homeAdvanced: true },
        })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // tip 1:1 (draw) vs reg 0:0 (also draw, different scores):
      // exact ✗, score_diff ✓ (0=0), winner ✗ (strict draw), draw ✓, advance ✓
      expect(result.results[0].totalPoints).toBe(7) // score_diff(1)+draw(3)+advance(3)
    })

    it('wrong advance prediction still scores regulation correctly', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        playoffMatch({
          reg: [0, 0],
          final: [1, 0],
          isOvertime: true,
          isShootout: false,
          homeAdvanced: true,
          bet: { homeScore: 0, awayScore: 0, homeAdvanced: false }, // user said "away advances"
        })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // exact(3) + score_diff(1) + draw(3) = 7; winner ✗ (strict draw); advance ✗
      expect(result.results[0].totalPoints).toBe(7)
    })
  })

  describe('Hockey OT (sportId=1, keeps existing OT semantics)', () => {
    it('hockey tip 3:2 OT vs reg 2:2 → final 3:2 OT yields full points', async () => {
      mockTx.leagueMatch.findUniqueOrThrow.mockResolvedValue(
        makeLeagueMatch({
          Match: {
            homeRegularScore: 2,
            awayRegularScore: 2,
            homeFinalScore: 3,
            awayFinalScore: 2,
            isOvertime: true,
            isShootout: false,
            MatchScorer: [],
          },
          League: {
            sportId: 1, // Hockey
            Evaluator: [
              { id: 1, points: 10, config: null, EvaluatorType: { name: 'exact_score' } },
              { id: 2, points: 5, config: null, EvaluatorType: { name: 'winner' } },
            ],
          },
          UserBet: [
            {
              id: 1,
              homeScore: 3,
              awayScore: 2,
              scorerId: null,
              noScorer: null,
              overtime: true, // hockey-specific OT prediction
              homeAdvanced: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )
      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // exact_score for hockey still checks predicted OT == actual OT (both true) → +10
      // winner uses final 3:2 = "home" matches predicted 3:2 = "home" → +5
      expect(result.results[0].totalPoints).toBe(15)
    })
  })

  describe('Hockey scoring (sportId=1, exclusions still active)', () => {
    it('keeps suppressing score_difference under exact_score for hockey', async () => {
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
            sportId: 1, // Hockey
            Evaluator: [
              { id: 1, points: 10, config: null, EvaluatorType: { name: 'exact_score' } },
              { id: 2, points: 3, config: null, EvaluatorType: { name: 'score_difference' } },
              { id: 3, points: 5, config: null, EvaluatorType: { name: 'winner' } },
            ],
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
        })
      )

      const result = await evaluateMatchAtomic({ matchId: 1, leagueMatchId: 100 })
      // exact_score(10) + winner(5) = 15; score_difference(3) suppressed by exact_score
      expect(result.results[0].totalPoints).toBe(15)
      const scoreDiff = result.results[0].evaluatorResults.find(
        (r) => r.evaluatorName === 'score_difference'
      )
      expect(scoreDiff?.awarded).toBe(false)
    })
  })
})
