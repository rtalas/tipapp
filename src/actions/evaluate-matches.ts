'use server'

import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateMatchAtomic } from '@/lib/evaluation/match-evaluator'
import { z } from 'zod'
import { AuditLogger } from '@/lib/audit-logger'
import { requireAdmin } from '@/lib/auth-utils'

// Validation schemas
const evaluateMatchSchema = z.object({
  leagueMatchId: z.number().int().positive(),
  matchId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

export type EvaluateMatchInput = z.infer<typeof evaluateMatchSchema>

/**
 * Server action: Evaluate match bets
 * If userId provided, evaluates only that user's bet
 * Otherwise evaluates all users' bets for the match
 */
export async function evaluateMatchBets(input: EvaluateMatchInput) {
  return executeServerAction(input, {
    validator: evaluateMatchSchema,
    handler: async (validated) => {
      const startTime = Date.now()
      const session = await requireAdmin()

      const result = await evaluateMatchAtomic({
        matchId: validated.matchId,
        leagueMatchId: validated.leagueMatchId,
        userId: validated.userId,
      })

      // Calculate total points awarded
      const totalPoints = result.results.reduce(
        (sum, r) => sum + r.totalPoints,
        0
      )

      // Audit log (fire-and-forget)
      const durationMs = Date.now() - startTime
      AuditLogger.matchEvaluated(
        Number(session.user.id),
        validated.matchId,
        result.totalUsersEvaluated,
        totalPoints,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))

      return result
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
