import { prisma } from '@/lib/prisma'
import type { TransactionClient } from '@/lib/prisma-utils'
import { AppError } from '@/lib/error-handler'

export interface EvaluateQuestionOptions {
  questionId: number
  userId?: number
}

export interface EvaluationResult {
  userId: number
  betId: number
  pointsAwarded: number
  isCorrect: boolean | null // null if user didn't bet
}


/**
 * Evaluate question bets
 * Scoring: Correct = +points, Wrong = -(points/2), No bet = 0
 */
async function evaluateQuestion(
  options: EvaluateQuestionOptions,
  tx: TransactionClient
): Promise<EvaluationResult[]> {
  const { questionId, userId } = options

  // Fetch question with evaluators
  const question = await tx.leagueSpecialBetQuestion.findUniqueOrThrow({
    where: { id: questionId, deletedAt: null },
    include: {
      League: {
        include: {
          Evaluator: {
            where: {
              deletedAt: null,
              EvaluatorType: {
                name: 'question',
              },
            },
            include: {
              EvaluatorType: true,
            },
          },
        },
      },
      UserSpecialBetQuestion: {
        where: {
          deletedAt: null,
          ...(userId && { LeagueUser: { userId } }),
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

  // Validate question has result
  if (question.result === null) {
    throw new AppError('Question result must be set before evaluation', 'BAD_REQUEST', 400)
  }

  // Get evaluator points
  const questionEvaluator = question.League.Evaluator[0]
  if (!questionEvaluator) {
    throw new AppError('No question evaluator configured for this league', 'BAD_REQUEST', 400)
  }

  const basePoints = questionEvaluator.points || 0
  const correctPoints = basePoints
  const wrongPoints = Math.floor(basePoints / 2) * -1 // Divide by 2, then negate

  const results: EvaluationResult[] = []
  const now = new Date()

  // Evaluate each user bet
  for (const bet of question.UserSpecialBetQuestion) {
    let pointsAwarded = 0
    let isCorrect: boolean | null = null

    if (bet.userBet !== null) {
      // User made a bet
      if (bet.userBet === question.result) {
        // Correct answer
        pointsAwarded = correctPoints
        isCorrect = true
      } else {
        // Wrong answer
        pointsAwarded = wrongPoints
        isCorrect = false
      }
    }
    // else: User didn't bet (no row or null userBet) = 0 points, isCorrect = null

    // Update bet points
    await tx.userSpecialBetQuestion.update({
      where: { id: bet.id },
      data: {
        totalPoints: pointsAwarded,
        updatedAt: now,
      },
    })

    results.push({
      userId: bet.LeagueUser.userId,
      betId: bet.id,
      pointsAwarded,
      isCorrect,
    })
  }

  // Mark question as evaluated (only if not single-user evaluation)
  if (!userId) {
    await tx.leagueSpecialBetQuestion.update({
      where: { id: questionId },
      data: {
        isEvaluated: true,
        updatedAt: now,
      },
    })
  }

  return results
}

/**
 * Atomic wrapper for question evaluation
 * Ensures evaluation happens in a transaction
 */
export async function evaluateQuestionAtomic(
  options: EvaluateQuestionOptions
): Promise<{
  success: boolean
  results: EvaluationResult[]
  totalUsersEvaluated: number
}> {
  const results = await prisma.$transaction(async (tx) => {
    return await evaluateQuestion(options, tx)
  }, {
    isolationLevel: 'Serializable',
  })

  return {
    success: true,
    results,
    totalUsersEvaluated: results.length,
  }
}
