/**
 * Match evaluation orchestration
 * Coordinates evaluator execution, point calculation, and DB updates
 */

import { prisma } from '@/lib/prisma'
import { getMatchEvaluator, buildMatchBetContext } from '@/lib/evaluators'
import { evaluateScorer } from '@/lib/evaluators/scorer'
import { getLeagueRankingsAtTime } from '@/lib/scorer-ranking-utils'
import { AppError } from '@/lib/error-handler'
import type { ScorerRankedConfig } from '@/lib/evaluators/types'

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

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Main evaluation function for matches
 * Returns detailed results for each user
 * @param options - Evaluation options including matchId and optional userId
 * @param tx - Prisma transaction client for atomic operations
 */
async function evaluateMatch(
  options: EvaluateMatchOptions,
  tx: TransactionClient
): Promise<EvaluationResult[]> {
  const { matchId, leagueMatchId, userId } = options

  // 1. Fetch match with all necessary data
  const leagueMatch = await tx.leagueMatch.findUniqueOrThrow({
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
    throw new AppError('Cannot evaluate match without results', 'BAD_REQUEST', 400)
  }

  // 3. Get evaluators for this league (entity: match)
  const evaluators = leagueMatch.League.Evaluator

  if (evaluators.length === 0) {
    throw new AppError('No evaluators configured for this league', 'BAD_REQUEST', 400)
  }

  // 4. Batch-fetch all scorer rankings for this league at match time (single query)
  const leagueRankings = await getLeagueRankingsAtTime(
    leagueMatch.League.id,
    match.dateTime
  )

  // 5. Evaluate each user bet
  const results: EvaluationResult[] = []

  for (const userBet of leagueMatch.UserBet) {
    const context = buildMatchBetContext(userBet, match, leagueRankings)

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

      let points = 0

      // Handle scorer evaluator (supports both simple and rank-based modes)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = (evaluator as any).config
      if (evaluator.EvaluatorType.name === 'scorer' && config) {
        // Rank-based mode: config exists, call evaluateScorer directly with config
        const scorerConfig = config as unknown as ScorerRankedConfig
        points = evaluateScorer(context, scorerConfig) as number
      }
      // All other evaluators (including scorer without config)
      else {
        const awarded = evaluatorFn(context) as unknown as boolean
        points = awarded ? evaluator.points : 0
      }

      // Apply isDoubled multiplier per evaluator if configured
      const finalPoints = leagueMatch.isDoubled ? points * 2 : points

      evaluatorResults.push({
        evaluatorName: evaluator.EvaluatorType.name,
        awarded: points > 0,
        points: finalPoints,
      })

      totalPoints += finalPoints
    }

    results.push({
      userId: userBet.LeagueUser.userId,
      totalPoints,
      evaluatorResults,
    })

    // 6. Update UserBet.totalPoints in database
    await tx.userBet.update({
      where: { id: userBet.id },
      data: {
        totalPoints,
        updatedAt: new Date(),
      },
    })
  }

  // 7. Mark match as evaluated (only if evaluating all users)
  if (!userId) {
    await tx.match.update({
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
 * Ensures all-or-nothing evaluation using proper transaction client pattern
 */
export async function evaluateMatchAtomic(
  options: EvaluateMatchOptions
): Promise<{
  success: boolean
  results: EvaluationResult[]
  totalUsersEvaluated: number
}> {
  const results = await prisma.$transaction(async (tx) => {
    return await evaluateMatch(options, tx)
  }, {
    isolationLevel: 'Serializable',
  })

  return {
    success: true,
    results,
    totalUsersEvaluated: results.length,
  }
}
