'use server'

import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateMatchAtomic } from '@/lib/evaluation/match-evaluator'
import { evaluateAndLog } from '@/lib/evaluation/evaluate-action'
import { z } from 'zod'
import { AuditLogger } from '@/lib/logging/audit-logger'

const evaluateMatchSchema = z.object({
  leagueMatchId: z.number().int().positive(),
  matchId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

export type EvaluateMatchInput = z.infer<typeof evaluateMatchSchema>

export async function evaluateMatchBets(input: EvaluateMatchInput) {
  return executeServerAction(input, {
    validator: evaluateMatchSchema,
    handler: async (validated) =>
      evaluateAndLog({
        input: { matchId: validated.matchId, leagueMatchId: validated.leagueMatchId, userId: validated.userId },
        evaluate: evaluateMatchAtomic,
        entityId: validated.matchId,
        sumPoints: (r) => r.results.reduce((sum, res) => sum + res.totalPoints, 0),
        auditLog: AuditLogger.matchEvaluated,
        cacheTag: 'match-data',
      }),
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
