'use server'

import { revalidatePath } from 'next/cache'
import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateSeriesAtomic } from '@/lib/evaluation/series-evaluator'
import { z } from 'zod'

export const evaluateSeriesSchema = z.object({
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
      return await evaluateSeriesAtomic({
        seriesId: validated.seriesId,
        userId: validated.userId,
      })
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
