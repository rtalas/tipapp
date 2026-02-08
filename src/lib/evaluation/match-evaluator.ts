/**
 * Match evaluation orchestration
 * Coordinates evaluator execution, point calculation, and DB updates
 */

import { prisma } from '@/lib/prisma'
import type { TransactionClient } from '@/lib/prisma-utils'
import { getMatchEvaluator, buildMatchBetContext } from '@/lib/evaluators'
import { evaluateScorer } from '@/lib/evaluators/scorer'
import { getLeagueRankingsAtTime } from '@/lib/scorer-ranking-utils'
import { AppError } from '@/lib/error-handler'
import { scorerRankedConfigSchema } from '@/lib/validation/admin'
import type { ScorerRankedConfig } from '@/lib/evaluators/types'

/**
 * Exclusion rules: if any listed evaluator awarded points, this evaluator is skipped.
 * e.g. score_difference is excluded when exact_score already awarded.
 */
const MATCH_EXCLUSIONS: Record<string, string[]> = {
  score_difference: ['exact_score'],
  one_team_score: ['exact_score', 'score_difference'],
  draw: ['exact_score'],
}

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
          MatchScorer: { where: { deletedAt: null } },
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

    // First pass: evaluate all evaluators independently
    const rawResults: Array<{ name: string; points: number }> = []

    for (const evaluator of evaluators) {
      const evaluatorFn = getMatchEvaluator(evaluator.EvaluatorType.name)

      if (!evaluatorFn) {
        console.warn(
          `Unknown evaluator type: ${evaluator.EvaluatorType.name}`
        )
        continue
      }

      let points = 0

      // Scorer evaluator supports rank-based mode when config is present
      if (evaluator.EvaluatorType.name === 'scorer' && evaluator.config) {
        const parsed = scorerRankedConfigSchema.safeParse(evaluator.config)
        if (!parsed.success) {
          console.error(`Invalid scorer config for evaluator ${evaluator.id}:`, parsed.error.message)
          continue
        }
        const scorerConfig = parsed.data as ScorerRankedConfig
        points = evaluateScorer(context, scorerConfig) as number
      } else {
        const result = evaluatorFn(context)
        points = result ? evaluator.points : 0
      }

      rawResults.push({ name: evaluator.EvaluatorType.name, points })
    }

    // Second pass: apply exclusion rules and compute final points
    const awardedNames = new Set(rawResults.filter((r) => r.points > 0).map((r) => r.name))

    for (const raw of rawResults) {
      const excludedBy = MATCH_EXCLUSIONS[raw.name]
      const excluded = excludedBy?.some((e) => awardedNames.has(e)) ?? false
      const points = excluded ? 0 : raw.points
      const finalPoints = leagueMatch.isDoubled ? points * 2 : points

      evaluatorResults.push({
        evaluatorName: raw.name,
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
