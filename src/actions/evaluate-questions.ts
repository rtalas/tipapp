'use server'

import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateQuestionAtomic } from '@/lib/evaluation/question-evaluator'
import { evaluateAndLog } from '@/lib/evaluation/evaluate-action'
import { z } from 'zod'
import { AuditLogger } from '@/lib/logging/audit-logger'

const evaluateQuestionSchema = z.object({
  questionId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

type EvaluateQuestionInput = z.infer<typeof evaluateQuestionSchema>

export async function evaluateQuestionBets(input: EvaluateQuestionInput) {
  return executeServerAction(input, {
    validator: evaluateQuestionSchema,
    handler: async (validated) =>
      evaluateAndLog({
        input: { questionId: validated.questionId, userId: validated.userId },
        evaluate: evaluateQuestionAtomic,
        entityId: validated.questionId,
        sumPoints: (r) => r.results.reduce((sum, res) => sum + res.pointsAwarded, 0),
        auditLog: AuditLogger.questionEvaluated,
        cacheTag: 'question-data',
      }),
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
