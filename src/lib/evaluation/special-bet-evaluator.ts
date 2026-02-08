/**
 * Special bet evaluation orchestration
 * Handles team/player/value predictions including closest_value and question evaluators
 */

import { prisma } from '@/lib/prisma'
import type { TransactionClient } from '@/lib/prisma-utils'
import { AppError } from '@/lib/error-handler'
import {
  getSpecialEvaluator,
  isClosestValueEvaluator,
  isQuestionEvaluator,
  isGroupStageEvaluator,
  buildSpecialBetContext,
  buildClosestValueContext,
  buildQuestionContext,
  buildGroupStageContext,
  evaluateQuestion,
  type ClosestValueContext,
  type SpecialBetContext,
  type GroupStageContext,
  type GroupStageConfig,
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
      Evaluator: {
        include: {
          EvaluatorType: true,
        },
      },
      League: true,
      LeagueSpecialBetSingleTeamAdvanced: {
        where: { deletedAt: null },
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
    throw new AppError('Cannot evaluate special bet without result', 'BAD_REQUEST', 400)
  }

  // 3. Get evaluator
  const evaluator = specialBet.Evaluator

  if (!evaluator) {
    throw new AppError('No evaluator configured for this special bet', 'BAD_REQUEST', 400)
  }

  // Get evaluator function
  const evaluatorFn = getSpecialEvaluator(evaluator.EvaluatorType.name)

  if (!evaluatorFn) {
    throw new AppError(`Unknown evaluator type: ${evaluator.EvaluatorType.name}`, 'BAD_REQUEST', 400)
  }

  // 4. Evaluate each user bet
  const results: EvaluationResult[] = []

  for (const userBet of specialBet.UserSpecialBetSingle) {
    let awarded = false
    let points = 0

    // Special handling for question (returns point multiplier)
    if (isQuestionEvaluator(evaluator.EvaluatorType.name)) {
      const context = buildQuestionContext(userBet, specialBet)
      const multiplier = evaluateQuestion(context)
      points = Math.round(multiplier * evaluator.points)
      awarded = points !== 0 // For tracking purposes
    }
    // Special handling for closest_value (returns point multiplier)
    else if (isClosestValueEvaluator(evaluator.EvaluatorType.name)) {
      const context = buildClosestValueContext(
        userBet,
        specialBet,
        specialBet.UserSpecialBetSingle
      )
      const multiplier = (evaluatorFn as (ctx: ClosestValueContext) => number)(context)
      points = Math.round(multiplier * evaluator.points)
      awarded = points !== 0 // For tracking purposes
    }
    // Special handling for group_stage_team (returns points directly, requires config)
    else if (isGroupStageEvaluator(evaluator.EvaluatorType.name)) {
      if (!evaluator.config) {
        throw new AppError('Group stage evaluator requires config', 'BAD_REQUEST', 400)
      }

      const config = evaluator.config as unknown as GroupStageConfig
      const context = buildGroupStageContext(userBet, specialBet, config)
      points = (evaluatorFn as (ctx: GroupStageContext) => number)(context)
      awarded = points > 0
    }
    // Standard special bet evaluators
    else {
      const context = buildSpecialBetContext(userBet, specialBet)
      awarded = (evaluatorFn as (ctx: SpecialBetContext) => boolean)(context)
      points = awarded ? evaluator.points : 0
    }

    results.push({
      userId: userBet.LeagueUser.userId,
      totalPoints: points,
      evaluatorResults: [{
        evaluatorName: evaluator.EvaluatorType.name,
        awarded,
        points,
      }],
    })

    // 5. Update UserSpecialBetSingle.totalPoints
    await tx.userSpecialBetSingle.update({
      where: { id: userBet.id },
      data: {
        totalPoints: points,
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
