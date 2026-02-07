'use server'

import { revalidateTag } from 'next/cache'
import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateSeriesAtomic } from '@/lib/evaluation/series-evaluator'
import { z } from 'zod'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { requireAdmin } from '@/lib/auth/auth-utils'

const evaluateSeriesSchema = z.object({
  seriesId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

export type EvaluateSeriesInput = z.infer<typeof evaluateSeriesSchema>

/**
 * Server action: Evaluate series bets
 * If userId provided, evaluates only that user's bet
 * Otherwise evaluates all users' bets for the series
 */
export async function evaluateSeriesBets(input: EvaluateSeriesInput) {
  return executeServerAction(input, {
    validator: evaluateSeriesSchema,
    handler: async (validated) => {
      const startTime = Date.now()
      const session = await requireAdmin()

      const result = await evaluateSeriesAtomic({
        seriesId: validated.seriesId,
        userId: validated.userId,
      })

      // Calculate total points awarded
      const totalPoints = result.results.reduce(
        (sum, r) => sum + r.totalPoints,
        0
      )

      // Audit log (fire-and-forget)
      const durationMs = Date.now() - startTime
      AuditLogger.seriesEvaluated(
        Number(session.user.id),
        validated.seriesId,
        result.totalUsersEvaluated,
        totalPoints,
        durationMs
      ).catch((err) => console.error('Audit log failed:', err))

      // Invalidate user-facing caches (series data + leaderboard)
      revalidateTag('series-data', 'max')
      revalidateTag('leaderboard', 'max')

      return result
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
