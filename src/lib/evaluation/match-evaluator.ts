/**
 * Match evaluation orchestration
 * Coordinates evaluator execution, point calculation, and DB updates
 */

import { prisma } from '@/lib/prisma'
import { getMatchEvaluator, buildMatchBetContext } from '@/lib/evaluators'

interface EvaluateMatchOptions {
  matchId: number
  leagueMatchId: number
  userId?: number // If provided, evaluate only this user
}

interface EvaluationResult {
  userId: number
  totalPoints: number
  evaluatorResults: Array<{
    evaluatorName: string
    awarded: boolean
    points: number
  }>
}

/**
 * Main evaluation function for matches
 * Returns detailed results for each user
 */
export async function evaluateMatch(
  options: EvaluateMatchOptions
): Promise<EvaluationResult[]> {
  const { matchId, leagueMatchId, userId } = options

  // 1. Fetch match with all necessary data
  const leagueMatch = await prisma.leagueMatch.findUniqueOrThrow({
    where: { id: leagueMatchId },
    include: {
      Match: {
        include: {
          MatchScorer: true,
        },
      },
      League: {
        include: {
          Evaluator: {
            where: {
              entity: 'match',
              deletedAt: null,
            },
            include: {
              EvaluatorType: true,
            },
            orderBy: {
              // Order by name for consistent priority
              EvaluatorType: { name: 'asc' },
            },
          },
        },
      },
      UserBet: {
        where: {
          deletedAt: null,
          ...(userId && {
            LeagueUser: {
              userId,
            },
          }),
        },
        include: {
          LeagueUser: {
            include: {
              User: true,
            },
          },
        },
      },
    },
  })

  // 2. Validate match has results entered
  const match = leagueMatch.Match
  if (match.homeRegularScore === null || match.awayRegularScore === null) {
    throw new Error('Cannot evaluate match without results')
  }

  // 3. Get evaluators for this league (entity: match)
  const evaluators = leagueMatch.League.Evaluator

  if (evaluators.length === 0) {
    throw new Error('No evaluators configured for this league')
  }

  // 4. Evaluate each user bet
  const results: EvaluationResult[] = []

  for (const userBet of leagueMatch.UserBet) {
    // Build context
    const context = buildMatchBetContext(userBet, match)

    let totalPoints = 0
    const evaluatorResults = []

    // Run each evaluator
    for (const evaluator of evaluators) {
      const evaluatorFn = getMatchEvaluator(evaluator.EvaluatorType.name)

      if (!evaluatorFn) {
        console.warn(
          `Unknown evaluator type: ${evaluator.EvaluatorType.name}`
        )
        continue
      }

      // Execute evaluator function
      const awarded = evaluatorFn(context)
      const points = awarded ? parseInt(evaluator.points, 10) : 0

      evaluatorResults.push({
        evaluatorName: evaluator.EvaluatorType.name,
        awarded,
        points,
      })

      totalPoints += points
    }

    // Apply isDoubled multiplier if configured
    if (leagueMatch.isDoubled) {
      totalPoints *= 2
    }

    results.push({
      userId: userBet.LeagueUser.userId,
      totalPoints,
      evaluatorResults,
    })

    // 5. Update UserBet.totalPoints in database
    await prisma.userBet.update({
      where: { id: userBet.id },
      data: {
        totalPoints,
        updatedAt: new Date(),
      },
    })
  }

  // 6. Mark match as evaluated (only if evaluating all users)
  if (!userId) {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        isEvaluated: true,
        updatedAt: new Date(),
      },
    })
  }

  return results
}

/**
 * Wrapper for atomic transaction
 * Ensures all-or-nothing evaluation
 */
export async function evaluateMatchAtomic(
  options: EvaluateMatchOptions
): Promise<{
  success: boolean
  results: EvaluationResult[]
  totalUsersEvaluated: number
}> {
  const results = await prisma.$transaction(async (tx) => {
    // Temporarily override prisma for transaction
    const originalFindUniqueOrThrow = prisma.leagueMatch.findUniqueOrThrow
    const originalUpdate = prisma.userBet.update
    const originalMatchUpdate = prisma.match.update

    try {
      // @ts-ignore - Override for transaction
      prisma.leagueMatch.findUniqueOrThrow = tx.leagueMatch.findUniqueOrThrow.bind(tx.leagueMatch)
      // @ts-ignore - Override for transaction
      prisma.userBet.update = tx.userBet.update.bind(tx.userBet)
      // @ts-ignore - Override for transaction
      prisma.match.update = tx.match.update.bind(tx.match)

      return await evaluateMatch(options)
    } finally {
      // Restore original functions
      prisma.leagueMatch.findUniqueOrThrow = originalFindUniqueOrThrow
      prisma.userBet.update = originalUpdate
      prisma.match.update = originalMatchUpdate
    }
  })

  return {
    success: true,
    results,
    totalUsersEvaluated: results.length,
  }
}
