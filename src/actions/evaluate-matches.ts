'use server'

import { revalidatePath } from 'next/cache'
import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateMatchAtomic } from '@/lib/evaluation/match-evaluator'
import { z } from 'zod'

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
      return await evaluateMatchAtomic({
        matchId: validated.matchId,
        leagueMatchId: validated.leagueMatchId,
        userId: validated.userId,
      })
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
