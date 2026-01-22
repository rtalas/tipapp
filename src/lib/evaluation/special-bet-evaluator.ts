/**
 * Special bet evaluation orchestration
 * Handles team/player/value predictions including closest_value and question evaluators
 */

import { prisma } from '@/lib/prisma'
import {
  getSpecialEvaluator,
  isClosestValueEvaluator,
  isQuestionEvaluator,
  buildSpecialBetContext,
  buildClosestValueContext,
  buildQuestionContext,
  evaluateQuestion,
  type ClosestValueContext,
  type SpecialBetContext,
} from '@/lib/evaluators'

interface EvaluateSpecialBetOptions {
  specialBetId: number
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
 * Evaluate special bets
 * @param options - Evaluation options including specialBetId and optional userId
 * @param tx - Prisma transaction client for atomic operations
 */
async function evaluateSpecialBet(
  options: EvaluateSpecialBetOptions,
  tx: TransactionClient
): Promise<EvaluationResult[]> {
  const { specialBetId, userId } = options

  // 1. Fetch special bet with data
  const specialBet = await tx.leagueSpecialBetSingle.findUniqueOrThrow({
    where: { id: specialBetId },
    include: {
      League: {
        include: {
          Evaluator: {
            where: {
              entity: 'special',
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
      UserSpecialBetSingle: {
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

  // 2. Validate special bet has result
  const hasResult =
    specialBet.specialBetTeamResultId !== null ||
    specialBet.specialBetPlayerResultId !== null ||
    specialBet.specialBetValue !== null

  if (!hasResult) {
    throw new Error('Cannot evaluate special bet without result')
  }

  // 3. Get evaluators
  const evaluators = specialBet.League.Evaluator

  if (evaluators.length === 0) {
    throw new Error('No evaluators configured for this league')
  }

  // 4. Evaluate each user bet
  const results: EvaluationResult[] = []

  for (const userBet of specialBet.UserSpecialBetSingle) {
    let totalPoints = 0
    const evaluatorResults = []

    for (const evaluator of evaluators) {
      const evaluatorFn = getSpecialEvaluator(evaluator.EvaluatorType.name)

      if (!evaluatorFn) {
        console.warn(`Unknown evaluator type: ${evaluator.EvaluatorType.name}`)
        continue
      }

      let awarded = false
      let points = 0

      // Special handling for question (returns point multiplier)
      if (isQuestionEvaluator(evaluator.EvaluatorType.name)) {
        const context = buildQuestionContext(userBet, specialBet)
        const multiplier = evaluateQuestion(context)
        points = Math.round(multiplier * evaluator.points)
        awarded = points !== 0 // For tracking purposes
      }
      // Special handling for closest_value
      else if (isClosestValueEvaluator(evaluator.EvaluatorType.name)) {
        const context = buildClosestValueContext(
          userBet,
          specialBet,
          specialBet.UserSpecialBetSingle
        )
        awarded = (evaluatorFn as (ctx: ClosestValueContext) => boolean)(context)
        points = awarded ? evaluator.points : 0
      }
      // Standard special bet evaluators
      else {
        const context = buildSpecialBetContext(userBet, specialBet)
        awarded = (evaluatorFn as (ctx: SpecialBetContext) => boolean)(context)
        points = awarded ? evaluator.points : 0
      }

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

    // 5. Update UserSpecialBetSingle.totalPoints
    await tx.userSpecialBetSingle.update({
      where: { id: userBet.id },
      data: {
        totalPoints,
        updatedAt: new Date(),
      },
    })
  }

  // 6. Mark special bet as evaluated
  if (!userId) {
    await tx.leagueSpecialBetSingle.update({
      where: { id: specialBetId },
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
export async function evaluateSpecialBetAtomic(
  options: EvaluateSpecialBetOptions
): Promise<{
  success: boolean
  results: EvaluationResult[]
  totalUsersEvaluated: number
}> {
  const results = await prisma.$transaction(async (tx) => {
    return await evaluateSpecialBet(options, tx)
  }, {
    isolationLevel: 'Serializable',
  })

  return {
    success: true,
    results,
    totalUsersEvaluated: results.length,
  }
}
