'use server'

import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateSeriesAtomic } from '@/lib/evaluation/series-evaluator'
import { evaluateAndLog } from '@/lib/evaluation/evaluate-action'
import { z } from 'zod'
import { AuditLogger } from '@/lib/logging/audit-logger'

const evaluateSeriesSchema = z.object({
  seriesId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

export type EvaluateSeriesInput = z.infer<typeof evaluateSeriesSchema>

export async function evaluateSeriesBets(input: EvaluateSeriesInput) {
  return executeServerAction(input, {
    validator: evaluateSeriesSchema,
    handler: async (validated) =>
      evaluateAndLog({
        input: { seriesId: validated.seriesId, userId: validated.userId },
        evaluate: evaluateSeriesAtomic,
        entityId: validated.seriesId,
        sumPoints: (r) => r.results.reduce((sum, res) => sum + res.totalPoints, 0),
        auditLog: AuditLogger.seriesEvaluated,
        cacheTag: 'series-data',
      }),
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
