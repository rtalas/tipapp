'use server'

import { revalidatePath } from 'next/cache'
import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateSpecialBetAtomic } from '@/lib/evaluation/special-bet-evaluator'
import { z } from 'zod'

export const evaluateSpecialBetSchema = z.object({
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
      return await evaluateSpecialBetAtomic({
        specialBetId: validated.specialBetId,
        userId: validated.userId,
      })
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
