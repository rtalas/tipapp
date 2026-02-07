'use server'

import { revalidateTag } from 'next/cache'
import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateQuestionAtomic } from '@/lib/evaluation/question-evaluator'
import { z } from 'zod'
import { AuditLogger } from '@/lib/audit-logger'
import { requireAdmin } from '@/lib/auth-utils'

const evaluateQuestionSchema = z.object({
  questionId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

type EvaluateQuestionInput = z.infer<typeof evaluateQuestionSchema>

/**
 * Server action: Evaluate question bets
 * If userId provided, evaluates only that user's bet
 * Otherwise evaluates all users' bets for the question
 */
export async function evaluateQuestionBets(input: EvaluateQuestionInput) {
  return executeServerAction(input, {
    validator: evaluateQuestionSchema,
    handler: async (validated) => {
      const startTime = Date.now()
      const session = await requireAdmin()

      const result = await evaluateQuestionAtomic({
        questionId: validated.questionId,
        userId: validated.userId,
      })

      // Calculate total points awarded
      const totalPoints = result.results.reduce(
        (sum, r) => sum + r.pointsAwarded,
        0
      )

      // Audit log (fire-and-forget)
      const durationMs = Date.now() - startTime
      AuditLogger.questionEvaluated(
        Number(session.user.id),
        validated.questionId,
        result.totalUsersEvaluated,
        totalPoints,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))

      // Invalidate user-facing caches (question data + leaderboard)
      revalidateTag('question-data', 'max')
      revalidateTag('leaderboard', 'max')

      return result
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
