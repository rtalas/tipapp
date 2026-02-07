import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireLeagueMember, isBettingOpen } from '@/lib/auth/user-auth-utils'
import { AppError } from '@/lib/error-handler'
import type { ZodType } from 'zod'

export type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ==================== saveUserBet ====================

interface SaveUserBetConfig<TValidated> {
  input: unknown
  schema: ZodType<TValidated>
  entityLabel: string
  findLeagueId: (validated: TValidated) => Promise<number | null>
  runTransaction: (
    tx: TransactionClient,
    validated: TValidated,
    leagueUserId: number
  ) => Promise<boolean>
  audit: {
    getEntityId: (validated: TValidated) => number
    getMetadata: (validated: TValidated) => Record<string, unknown>
    onCreated: (
      userId: number,
      leagueId: number,
      entityId: number,
      metadata: Record<string, unknown>,
      durationMs: number
    ) => Promise<void>
    onUpdated: (
      userId: number,
      leagueId: number,
      entityId: number,
      metadata: Record<string, unknown>,
      durationMs: number
    ) => Promise<void>
  }
  revalidatePathSuffix: string
}

/**
 * Generic save-bet helper that handles:
 * parse → entity lookup → membership → Serializable tx → audit → revalidate → error handling
 *
 * The `runTransaction` callback receives the tx client, validated data, and leagueUserId.
 * It must return `true` if an existing bet was updated, `false` if a new bet was created.
 */
export async function saveUserBet<TValidated>(
  config: SaveUserBetConfig<TValidated>
): Promise<{ success: true } | { success: false; error: string }> {
  const startTime = Date.now()
  const parsed = config.schema.safeParse(config.input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid input',
    }
  }

  const validated = parsed.data

  const leagueId = await config.findLeagueId(validated)
  if (!leagueId) {
    return { success: false as const, error: `${config.entityLabel} not found` }
  }

  const { leagueUser } = await requireLeagueMember(leagueId)

  try {
    let isUpdate = false

    await prisma.$transaction(
      async (tx) => {
        isUpdate = await config.runTransaction(
          tx as TransactionClient,
          validated,
          leagueUser.id
        )
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    )

    // Audit log (fire-and-forget)
    const durationMs = Date.now() - startTime
    const entityId = config.audit.getEntityId(validated)
    const metadata = config.audit.getMetadata(validated)

    const auditFn = isUpdate ? config.audit.onUpdated : config.audit.onCreated
    auditFn(leagueUser.userId, leagueId, entityId, metadata, durationMs).catch(
      (err) => console.error('Audit log failed:', err)
    )

    revalidateTag('bet-badges', 'max')
    revalidatePath(`/${leagueId}${config.revalidatePathSuffix}`)
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false as const, error: error.message }
    }
    throw error
  }
}

// ==================== getFriendPredictions ====================

interface FriendPredictionsConfig<TEntity, TPrediction> {
  entityId: number
  entityLabel: string
  findEntity: (id: number) => Promise<TEntity | null>
  getLeagueId: (entity: TEntity) => number
  getDateTime: (entity: TEntity) => Date | string
  findPredictions: (
    entityId: number,
    excludeLeagueUserId: number
  ) => Promise<TPrediction[]>
}

/**
 * Generic friend-predictions helper that handles:
 * entity lookup → membership → lock check → fetch predictions
 */
export async function getFriendPredictions<TEntity, TPrediction>(
  config: FriendPredictionsConfig<TEntity, TPrediction>
): Promise<{ isLocked: boolean; predictions: TPrediction[] }> {
  const entity = await config.findEntity(config.entityId)

  if (!entity) {
    throw new AppError(`${config.entityLabel} not found`, 'NOT_FOUND', 404)
  }

  const { leagueUser } = await requireLeagueMember(config.getLeagueId(entity))

  if (isBettingOpen(config.getDateTime(entity))) {
    return { isLocked: false, predictions: [] }
  }

  const predictions = await config.findPredictions(
    config.entityId,
    leagueUser.id
  )

  return { isLocked: true, predictions }
}
