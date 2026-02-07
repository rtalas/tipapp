import { describe, it, expect, beforeEach, vi } from 'vitest'
import { evaluateSpecialBetAtomic } from './special-bet-evaluator'
import { prisma } from '@/lib/prisma'

describe('Special Bet Evaluator', () => {
  const mockTx = {
    leagueSpecialBetSingle: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    userSpecialBetSingle: {
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

    mockTx.userSpecialBetSingle.update.mockResolvedValue({})
    mockTx.leagueSpecialBetSingle.update.mockResolvedValue({})
  })

  // --- exact_team evaluator ---

  describe('exact_team (Standard Boolean)', () => {
    it('should award points for correct team prediction', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'exact_team' },
        },
        UserSpecialBetSingle: [
          {
            id: 1,
            teamResultId: 10, // Correct
            playerResultId: null,
            value: null,
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
        ],
      })

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.results[0].totalPoints).toBe(20)
      expect(result.results[0].evaluatorResults[0]).toEqual({
        evaluatorName: 'exact_team',
        awarded: true,
        points: 20,
      })
    })

    it('should award zero for wrong team prediction', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'exact_team' },
        },
        UserSpecialBetSingle: [
          {
            id: 1,
            teamResultId: 99, // Wrong
            playerResultId: null,
            value: null,
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
        ],
      })

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(result.results[0].totalPoints).toBe(0)
      expect(result.results[0].evaluatorResults[0].awarded).toBe(false)
    })
  })

  // --- exact_player evaluator ---

  describe('exact_player (Standard Boolean)', () => {
    it('should award points for correct player prediction', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: null,
        specialBetPlayerResultId: 42,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 15,
          config: null,
          EvaluatorType: { name: 'exact_player' },
        },
        UserSpecialBetSingle: [
          {
            id: 1,
            teamResultId: null,
            playerResultId: 42, // Correct
            value: null,
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
        ],
      })

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(result.results[0].totalPoints).toBe(15)
      expect(result.results[0].evaluatorResults[0].awarded).toBe(true)
    })
  })

  // Note: 'question' evaluator type is NOT in getSpecialEvaluator() map.
  // Questions are evaluated via the separate question-evaluator.ts path.
  // The isQuestionEvaluator() branch in special-bet-evaluator.ts is unreachable
  // because getSpecialEvaluator('question') returns null and throws first.

  // --- closest_value evaluator (multiplier-based) ---

  describe('closest_value (Multiplier-Based)', () => {
    function makeClosestValueBet(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        specialBetTeamResultId: null,
        specialBetPlayerResultId: null,
        specialBetValue: 50, // Actual value
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 30,
          config: null,
          EvaluatorType: { name: 'closest_value' },
        },
        UserSpecialBetSingle: [
          {
            id: 1,
            teamResultId: null,
            playerResultId: null,
            value: 50, // Exact match
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
        ],
        ...overrides,
      }
    }

    it('should award full points for exact value match', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue(
        makeClosestValueBet()
      )

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      // evaluateClosestValue returns 1.0 for exact → Math.round(1.0 * 30) = 30
      expect(result.results[0].totalPoints).toBe(30)
    })

    it('should award 1/3 points for closest (not exact) prediction', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue(
        makeClosestValueBet({
          UserSpecialBetSingle: [
            {
              id: 1,
              teamResultId: null,
              playerResultId: null,
              value: 48, // Closest but not exact
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
            {
              id: 2,
              teamResultId: null,
              playerResultId: null,
              value: 60, // Further away
              LeagueUser: { userId: 2, User: { id: 2 } },
            },
          ],
        })
      )

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      // User 1: closest (diff=2), not exact → 0.33 * 30 = 9.9 → Math.round = 10
      expect(result.results[0].totalPoints).toBe(10)
      // User 2: not closest (diff=10) → 0 * 30 = 0
      expect(result.results[1].totalPoints).toBe(0)
    })

    it('should award zero for non-closest prediction', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue(
        makeClosestValueBet({
          UserSpecialBetSingle: [
            {
              id: 1,
              teamResultId: null,
              playerResultId: null,
              value: 100, // Far away
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
            {
              id: 2,
              teamResultId: null,
              playerResultId: null,
              value: 49, // Closer
              LeagueUser: { userId: 2, User: { id: 2 } },
            },
          ],
        })
      )

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      // User 1: not closest → 0
      expect(result.results[0].totalPoints).toBe(0)
      // User 2: closest → 0.33 * 30 ≈ 10
      expect(result.results[1].totalPoints).toBe(10)
    })
  })

  // --- group_stage_team evaluator (config-based) ---

  describe('group_stage_team (Config-Based)', () => {
    function makeGroupStageBet(overrides: Record<string, unknown> = {}) {
      return {
        id: 1,
        specialBetTeamResultId: 10, // Group winner
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [
          { leagueTeamId: 10 }, // Winner also advances
          { leagueTeamId: 20 }, // Another advancing team
        ],
        Evaluator: {
          id: 1,
          points: 0, // Not used directly
          config: {
            winnerPoints: 10,
            advancePoints: 5,
          },
          EvaluatorType: { name: 'group_stage_team' },
        },
        UserSpecialBetSingle: [
          {
            id: 1,
            teamResultId: 10, // Predicted the winner
            playerResultId: null,
            value: null,
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
        ],
        ...overrides,
      }
    }

    it('should award winner points when predicting group winner', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue(
        makeGroupStageBet()
      )

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(result.results[0].totalPoints).toBe(10) // winnerPoints
      expect(result.results[0].evaluatorResults[0].awarded).toBe(true)
    })

    it('should award advance points when predicting advancing (non-winner) team', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue(
        makeGroupStageBet({
          UserSpecialBetSingle: [
            {
              id: 1,
              teamResultId: 20, // Advancing but not winner
              playerResultId: null,
              value: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(result.results[0].totalPoints).toBe(5) // advancePoints
      expect(result.results[0].evaluatorResults[0].awarded).toBe(true)
    })

    it('should award zero when predicted team does not advance', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue(
        makeGroupStageBet({
          UserSpecialBetSingle: [
            {
              id: 1,
              teamResultId: 99, // Team that didn't advance
              playerResultId: null,
              value: null,
              LeagueUser: { userId: 1, User: { id: 1 } },
            },
          ],
        })
      )

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(result.results[0].totalPoints).toBe(0)
      expect(result.results[0].evaluatorResults[0].awarded).toBe(false)
    })

    it('should throw when group stage evaluator has no config', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue(
        makeGroupStageBet({
          Evaluator: {
            id: 1,
            points: 0,
            config: null, // Missing config
            EvaluatorType: { name: 'group_stage_team' },
          },
        })
      )

      await expect(
        evaluateSpecialBetAtomic({ specialBetId: 1 })
      ).rejects.toThrow('Group stage evaluator requires config')
    })
  })

  // --- Multiple Users ---

  describe('Multiple Users', () => {
    it('should evaluate all users with mixed results', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'exact_team' },
        },
        UserSpecialBetSingle: [
          {
            id: 1,
            teamResultId: 10, // Correct
            playerResultId: null,
            value: null,
            LeagueUser: { userId: 1, User: { id: 1 } },
          },
          {
            id: 2,
            teamResultId: 99, // Wrong
            playerResultId: null,
            value: null,
            LeagueUser: { userId: 2, User: { id: 2 } },
          },
          {
            id: 3,
            teamResultId: 10, // Correct
            playerResultId: null,
            value: null,
            LeagueUser: { userId: 3, User: { id: 3 } },
          },
        ],
      })

      const result = await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(result.results).toHaveLength(3)
      expect(result.totalUsersEvaluated).toBe(3)
      expect(result.results[0].totalPoints).toBe(20) // Correct
      expect(result.results[1].totalPoints).toBe(0)  // Wrong
      expect(result.results[2].totalPoints).toBe(20) // Correct

      expect(mockTx.userSpecialBetSingle.update).toHaveBeenCalledTimes(3)
    })
  })

  // --- Marking as Evaluated ---

  describe('Marked as Evaluated', () => {
    it('should mark special bet as evaluated after full evaluation', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'exact_team' },
        },
        UserSpecialBetSingle: [],
      })

      await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(mockTx.leagueSpecialBetSingle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            isEvaluated: true,
          }),
        })
      )
    })

    it('should NOT mark as evaluated when evaluating single user', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'exact_team' },
        },
        UserSpecialBetSingle: [],
      })

      await evaluateSpecialBetAtomic({ specialBetId: 1, userId: 1 })

      expect(mockTx.leagueSpecialBetSingle.update).not.toHaveBeenCalled()
    })
  })

  // --- Error Handling ---

  describe('Error Handling', () => {
    it('should throw when special bet has no result', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: null,
        specialBetPlayerResultId: null,
        specialBetValue: null, // No result at all
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'exact_team' },
        },
        UserSpecialBetSingle: [],
      })

      await expect(
        evaluateSpecialBetAtomic({ specialBetId: 1 })
      ).rejects.toThrow('Cannot evaluate special bet without result')
    })

    it('should throw when no evaluator configured', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: null, // No evaluator
        UserSpecialBetSingle: [],
      })

      await expect(
        evaluateSpecialBetAtomic({ specialBetId: 1 })
      ).rejects.toThrow('No evaluator configured for this special bet')
    })

    it('should throw when evaluator type is unknown', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'nonexistent_type' },
        },
        UserSpecialBetSingle: [],
      })

      await expect(
        evaluateSpecialBetAtomic({ specialBetId: 1 })
      ).rejects.toThrow('Unknown evaluator type: nonexistent_type')
    })
  })

  // --- Transaction ---

  describe('Transaction Isolation', () => {
    it('should execute in Serializable transaction', async () => {
      mockTx.leagueSpecialBetSingle.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        specialBetTeamResultId: 10,
        specialBetPlayerResultId: null,
        specialBetValue: null,
        League: {},
        LeagueSpecialBetSingleTeamAdvanced: [],
        Evaluator: {
          id: 1,
          points: 20,
          config: null,
          EvaluatorType: { name: 'exact_team' },
        },
        UserSpecialBetSingle: [],
      })

      await evaluateSpecialBetAtomic({ specialBetId: 1 })

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      )
    })
  })
})
