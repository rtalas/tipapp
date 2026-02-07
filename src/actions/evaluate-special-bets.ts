'use server'

import { revalidateTag } from 'next/cache'
import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateSpecialBetAtomic } from '@/lib/evaluation/special-bet-evaluator'
import { z } from 'zod'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { requireAdmin } from '@/lib/auth/auth-utils'

const evaluateSpecialBetSchema = z.object({
  specialBetId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

export type EvaluateSpecialBetInput = z.infer<typeof evaluateSpecialBetSchema>

/**
 * Server action: Evaluate special bet picks
 * If userId provided, evaluates only that user's bet
 * Otherwise evaluates all users' bets for the special bet
 */
export async function evaluateSpecialBetBets(input: EvaluateSpecialBetInput) {
  return executeServerAction(input, {
    validator: evaluateSpecialBetSchema,
    handler: async (validated) => {
      const startTime = Date.now()
      const session = await requireAdmin()

      const result = await evaluateSpecialBetAtomic({
        specialBetId: validated.specialBetId,
        userId: validated.userId,
      })

      // Calculate total points awarded
      const totalPoints = result.results.reduce(
        (sum, r) => sum + r.totalPoints,
        0
      )

      // Audit log (fire-and-forget)
      const durationMs = Date.now() - startTime
      AuditLogger.specialBetEvaluated(
        Number(session.user.id),
        validated.specialBetId,
        result.totalUsersEvaluated,
        totalPoints,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))

      // Invalidate user-facing caches (special bet data + leaderboard)
      revalidateTag('special-bet-data', 'max')
      revalidateTag('leaderboard', 'max')

      return result
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
