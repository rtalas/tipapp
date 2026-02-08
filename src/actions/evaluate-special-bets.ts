'use server'

import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateSpecialBetAtomic } from '@/lib/evaluation/special-bet-evaluator'
import { evaluateAndLog } from '@/lib/evaluation/evaluate-action'
import { z } from 'zod'
import { AuditLogger } from '@/lib/logging/audit-logger'

const evaluateSpecialBetSchema = z.object({
  specialBetId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

export type EvaluateSpecialBetInput = z.infer<typeof evaluateSpecialBetSchema>

export async function evaluateSpecialBetBets(input: EvaluateSpecialBetInput) {
  return executeServerAction(input, {
    validator: evaluateSpecialBetSchema,
    handler: async (validated) =>
      evaluateAndLog({
        input: { specialBetId: validated.specialBetId, userId: validated.userId },
        evaluate: evaluateSpecialBetAtomic,
        entityId: validated.specialBetId,
        sumPoints: (r) => r.results.reduce((sum, res) => sum + res.totalPoints, 0),
        auditLog: AuditLogger.specialBetEvaluated,
        cacheTag: 'special-bet-data',
      }),
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
