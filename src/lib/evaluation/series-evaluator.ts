/**
 * Series evaluation orchestration
 * Similar to match evaluator but for series bets
 */

import { prisma } from '@/lib/prisma'
import { getSeriesEvaluator, buildSeriesBetContext } from '@/lib/evaluators'

interface EvaluateSeriesOptions {
  seriesId: number
  userId?: number
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
 * Evaluate series bets
 * @param options - Evaluation options including seriesId and optional userId
 * @param tx - Prisma transaction client for atomic operations
 */
async function evaluateSeries(
  options: EvaluateSeriesOptions,
  tx: TransactionClient
): Promise<EvaluationResult[]> {
  const { seriesId, userId } = options

  // 1. Fetch series with data
  const series = await tx.leagueSpecialBetSerie.findUniqueOrThrow({
    where: { id: seriesId },
    include: {
      League: {
        include: {
          Evaluator: {
            where: {
              entity: 'series',
              deletedAt: null,
            },
            include: {
              EvaluatorType: true,
            },
            orderBy: {
              EvaluatorType: { name: 'asc' },
            },
          },
        },
      },
      UserSpecialBetSerie: {
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

  // 2. Validate series has results
  if (series.homeTeamScore === null || series.awayTeamScore === null) {
    throw new Error('Cannot evaluate series without results')
  }

  // 3. Get evaluators
  const evaluators = series.League.Evaluator

  if (evaluators.length === 0) {
    throw new Error('No evaluators configured for this league')
  }

  // 4. Evaluate each user bet
  const results: EvaluationResult[] = []

  for (const userBet of series.UserSpecialBetSerie) {
    const context = buildSeriesBetContext(userBet, series)

    let totalPoints = 0
    const evaluatorResults = []

    for (const evaluator of evaluators) {
      const evaluatorFn = getSeriesEvaluator(evaluator.EvaluatorType.name)

      if (!evaluatorFn) {
        console.warn(`Unknown evaluator type: ${evaluator.EvaluatorType.name}`)
        continue
      }

      const awarded = evaluatorFn(context)
      const points = awarded ? parseInt(evaluator.points, 10) : 0

      evaluatorResults.push({
        evaluatorName: evaluator.EvaluatorType.name,
        awarded,
        points,
      })

      totalPoints += points
    }

    results.push({
      userId: userBet.LeagueUser.userId,
      totalPoints,
      evaluatorResults,
    })

    // 5. Update UserSpecialBetSerie.totalPoints
    await tx.userSpecialBetSerie.update({
      where: { id: userBet.id },
      data: {
        totalPoints,
        updatedAt: new Date(),
      },
    })
  }

  // 6. Mark series as evaluated
  if (!userId) {
    await tx.leagueSpecialBetSerie.update({
      where: { id: seriesId },
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
export async function evaluateSeriesAtomic(
  options: EvaluateSeriesOptions
): Promise<{
  success: boolean
  results: EvaluationResult[]
  totalUsersEvaluated: number
}> {
  const results = await prisma.$transaction(async (tx) => {
    return await evaluateSeries(options, tx)
  }, {
    isolationLevel: 'Serializable',
  })

  return {
    success: true,
    results,
    totalUsersEvaluated: results.length,
  }
}
