import { updateTag } from 'next/cache'
import { requireAdmin } from '@/lib/auth/auth-utils'

interface EvaluateActionOptions<TInput, TResult extends { totalUsersEvaluated: number }> {
  input: TInput
  evaluate: (input: TInput) => Promise<TResult>
  entityId: number
  sumPoints: (result: TResult) => number
  auditLog: (
    adminId: number,
    entityId: number,
    affectedUsers: number,
    totalPoints: number,
    durationMs: number
  ) => Promise<void>
  cacheTag: string
}

export async function evaluateAndLog<TInput, TResult extends { totalUsersEvaluated: number }>({
  input,
  evaluate,
  entityId,
  sumPoints,
  auditLog,
  cacheTag,
}: EvaluateActionOptions<TInput, TResult>): Promise<TResult> {
  const startTime = Date.now()
  const session = await requireAdmin()

  const result = await evaluate(input)
  const totalPoints = sumPoints(result)

  const durationMs = Date.now() - startTime
  auditLog(
    Number(session.user.id),
    entityId,
    result.totalUsersEvaluated,
    totalPoints,
    durationMs,
  ).catch((err) => console.error('Audit log failed:', err))

  updateTag(cacheTag)

  return result
}
