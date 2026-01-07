import { describe, it, expect } from 'vitest'

// Pure functions to test evaluation logic without database dependencies
// These mirror the logic in src/actions/matches.ts evaluateMatch

/**
 * Determine winner: 1 = home, 2 = away, 0 = draw
 */
function getWinner(homeScore: number, awayScore: number): number {
  if (homeScore > awayScore) return 1
  if (awayScore > homeScore) return 2
  return 0
}

interface Bet {
  homeScore: number
  awayScore: number
  scorerId?: number | null
}

interface MatchResult {
  homeScore: number
  awayScore: number
  scorerIds: number[]
}

interface EvaluatorRules {
  exact_score: number
  winner: number
  goal_difference: number
  total_goals: number
  scorer: number
}

/**
 * Calculate points for a single bet against match result
 */
function calculateBetPoints(
  bet: Bet,
  result: MatchResult,
  rules: EvaluatorRules,
  multiplier: number = 1
): number {
  let points = 0

  // Check exact score
  if (bet.homeScore === result.homeScore && bet.awayScore === result.awayScore) {
    points += rules.exact_score
  }

  // Check correct winner
  const betWinner = getWinner(bet.homeScore, bet.awayScore)
  const actualWinner = getWinner(result.homeScore, result.awayScore)
  if (betWinner === actualWinner) {
    points += rules.winner
  }

  // Check goal difference
  const betGoalDifference = bet.homeScore - bet.awayScore
  const actualGoalDifference = result.homeScore - result.awayScore
  if (betGoalDifference === actualGoalDifference) {
    points += rules.goal_difference
  }

  // Check total goals
  const betTotalGoals = bet.homeScore + bet.awayScore
  const actualTotalGoals = result.homeScore + result.awayScore
  if (betTotalGoals === actualTotalGoals) {
    points += rules.total_goals
  }

  // Check scorer (if user predicted a scorer and it matches)
  if (bet.scorerId && result.scorerIds.includes(bet.scorerId)) {
    points += rules.scorer
  }

  return points * multiplier
}

describe('Evaluation Logic', () => {
  // Default rules for testing
  const defaultRules: EvaluatorRules = {
    exact_score: 5,
    winner: 2,
    goal_difference: 3,
    total_goals: 1,
    scorer: 2,
  }

  describe('getWinner', () => {
    it('should return 1 for home win', () => {
      expect(getWinner(3, 1)).toBe(1)
      expect(getWinner(2, 0)).toBe(1)
      expect(getWinner(5, 4)).toBe(1)
    })

    it('should return 2 for away win', () => {
      expect(getWinner(1, 3)).toBe(2)
      expect(getWinner(0, 2)).toBe(2)
      expect(getWinner(4, 5)).toBe(2)
    })

    it('should return 0 for draw', () => {
      expect(getWinner(0, 0)).toBe(0)
      expect(getWinner(2, 2)).toBe(0)
      expect(getWinner(5, 5)).toBe(0)
    })
  })

  describe('calculateBetPoints', () => {
    describe('exact score', () => {
      it('should award exact score points for perfect prediction', () => {
        const bet: Bet = { homeScore: 3, awayScore: 1 }
        const result: MatchResult = { homeScore: 3, awayScore: 1, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) = 11
        expect(points).toBe(11)
      })

      it('should not award exact score for different score', () => {
        const bet: Bet = { homeScore: 2, awayScore: 1 }
        const result: MatchResult = { homeScore: 3, awayScore: 1, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) only
        expect(points).toBe(2)
      })
    })

    describe('correct winner', () => {
      it('should award winner points for correct home win prediction', () => {
        const bet: Bet = { homeScore: 5, awayScore: 0 }
        const result: MatchResult = { homeScore: 2, awayScore: 1, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) only - different score, different diff, different total
        expect(points).toBe(2)
      })

      it('should award winner points for correct away win prediction', () => {
        const bet: Bet = { homeScore: 0, awayScore: 3 }
        const result: MatchResult = { homeScore: 1, awayScore: 4, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) + goal_difference (3) = 5
        expect(points).toBe(5)
      })

      it('should award winner points for correct draw prediction', () => {
        const bet: Bet = { homeScore: 0, awayScore: 0 }
        const result: MatchResult = { homeScore: 2, awayScore: 2, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) + goal_difference (3) = 5
        expect(points).toBe(5)
      })

      it('should not award winner points for wrong prediction', () => {
        const bet: Bet = { homeScore: 3, awayScore: 1 }
        const result: MatchResult = { homeScore: 1, awayScore: 2, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // No points - wrong winner
        expect(points).toBe(0)
      })
    })

    describe('goal difference', () => {
      it('should award goal difference points for correct difference', () => {
        const bet: Bet = { homeScore: 4, awayScore: 2 }
        const result: MatchResult = { homeScore: 3, awayScore: 1, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) + goal_difference (3) = 5
        expect(points).toBe(5)
      })

      it('should award goal difference for draws', () => {
        const bet: Bet = { homeScore: 1, awayScore: 1 }
        const result: MatchResult = { homeScore: 3, awayScore: 3, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) + goal_difference (3) = 5
        expect(points).toBe(5)
      })

      it('should handle negative goal differences', () => {
        const bet: Bet = { homeScore: 1, awayScore: 3 }
        const result: MatchResult = { homeScore: 2, awayScore: 4, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) + goal_difference (3) = 5
        expect(points).toBe(5)
      })
    })

    describe('total goals', () => {
      it('should award total goals points for correct total', () => {
        const bet: Bet = { homeScore: 2, awayScore: 2 }
        const result: MatchResult = { homeScore: 3, awayScore: 1, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // total_goals (1) only
        expect(points).toBe(1)
      })

      it('should not award total goals for different total', () => {
        const bet: Bet = { homeScore: 3, awayScore: 0 }
        const result: MatchResult = { homeScore: 2, awayScore: 0, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // winner (2) only
        expect(points).toBe(2)
      })
    })

    describe('scorer prediction', () => {
      it('should award scorer points for correct scorer', () => {
        const bet: Bet = { homeScore: 2, awayScore: 1, scorerId: 101 }
        const result: MatchResult = { homeScore: 2, awayScore: 1, scorerIds: [101, 102, 201] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) + scorer (2) = 13
        expect(points).toBe(13)
      })

      it('should not award scorer points for wrong scorer', () => {
        const bet: Bet = { homeScore: 2, awayScore: 1, scorerId: 999 }
        const result: MatchResult = { homeScore: 2, awayScore: 1, scorerIds: [101, 102, 201] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) = 11 (no scorer)
        expect(points).toBe(11)
      })

      it('should not award scorer points when no scorer predicted', () => {
        const bet: Bet = { homeScore: 2, awayScore: 1, scorerId: null }
        const result: MatchResult = { homeScore: 2, awayScore: 1, scorerIds: [101, 102, 201] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) = 11 (no scorer)
        expect(points).toBe(11)
      })
    })

    describe('multiplier (double points)', () => {
      it('should double all points when multiplier is 2', () => {
        const bet: Bet = { homeScore: 3, awayScore: 1, scorerId: 101 }
        const result: MatchResult = { homeScore: 3, awayScore: 1, scorerIds: [101] }

        const points = calculateBetPoints(bet, result, defaultRules, 2)

        // (exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) + scorer (2)) * 2 = 26
        expect(points).toBe(26)
      })

      it('should apply multiplier to partial points', () => {
        const bet: Bet = { homeScore: 2, awayScore: 0 }
        const result: MatchResult = { homeScore: 3, awayScore: 1, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules, 2)

        // winner (2) + goal_difference (3) = 5, * 2 = 10
        // Both predict home win by 2 goals
        expect(points).toBe(10)
      })

      it('should handle multiplier of 1 (no change)', () => {
        const bet: Bet = { homeScore: 3, awayScore: 1 }
        const result: MatchResult = { homeScore: 3, awayScore: 1, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules, 1)

        // exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) = 11
        expect(points).toBe(11)
      })
    })

    describe('edge cases', () => {
      it('should handle 0-0 draws correctly', () => {
        const bet: Bet = { homeScore: 0, awayScore: 0 }
        const result: MatchResult = { homeScore: 0, awayScore: 0, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) = 11
        expect(points).toBe(11)
      })

      it('should handle high scoring games', () => {
        const bet: Bet = { homeScore: 7, awayScore: 5 }
        const result: MatchResult = { homeScore: 7, awayScore: 5, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // exact_score (5) + winner (2) + goal_difference (3) + total_goals (1) = 11
        expect(points).toBe(11)
      })

      it('should return 0 for completely wrong prediction', () => {
        const bet: Bet = { homeScore: 5, awayScore: 0 }
        const result: MatchResult = { homeScore: 1, awayScore: 3, scorerIds: [] }

        const points = calculateBetPoints(bet, result, defaultRules)

        // No points at all
        expect(points).toBe(0)
      })

      it('should handle custom evaluator rules', () => {
        const customRules: EvaluatorRules = {
          exact_score: 10,
          winner: 3,
          goal_difference: 5,
          total_goals: 2,
          scorer: 4,
        }

        const bet: Bet = { homeScore: 2, awayScore: 1, scorerId: 101 }
        const result: MatchResult = { homeScore: 2, awayScore: 1, scorerIds: [101] }

        const points = calculateBetPoints(bet, result, customRules)

        // exact_score (10) + winner (3) + goal_difference (5) + total_goals (2) + scorer (4) = 24
        expect(points).toBe(24)
      })
    })
  })
})
