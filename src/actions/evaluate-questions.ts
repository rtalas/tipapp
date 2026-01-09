'use server'

import { executeServerAction } from '@/lib/server-action-utils'
import { evaluateQuestionAtomic } from '@/lib/evaluation/question-evaluator'
import { z } from 'zod'

const evaluateQuestionSchema = z.object({
  questionId: z.number().int().positive(),
  userId: z.number().int().positive().optional(),
})

type EvaluateQuestionInput = z.infer<typeof evaluateQuestionSchema>

/**
 * Server action: Evaluate question bets
 * If userId provided, evaluates only that user's bet
 * Otherwise evaluates all users' bets for the question
 */
export async function evaluateQuestionBets(input: EvaluateQuestionInput) {
  return executeServerAction(input, {
    validator: evaluateQuestionSchema,
    handler: async (validated) => {
      return await evaluateQuestionAtomic({
        questionId: validated.questionId,
        userId: validated.userId,
      })
    },
    revalidatePath: '/admin',
    requiresAdmin: true,
  })
}
