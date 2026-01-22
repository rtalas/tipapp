'use server'

import { revalidatePath } from 'next/cache'
import { ZodSchema } from 'zod'
import { requireLeagueMember, type LeagueMemberResult } from './user-auth-utils'
import { getErrorMessage } from './error-handler'

/**
 * League user type (subset returned by requireLeagueMember)
 */
type LeagueUser = LeagueMemberResult['leagueUser']

/**
 * Configuration options for user action execution
 * @template T - The validated input type (inferred from Zod schema)
 * @template R - The return type of the handler (defaults to Record<string, unknown>)
 */
export interface UserActionOptions<T, R = Record<string, unknown>> {
  /** Zod schema for validating input */
  validator: ZodSchema<T>
  /** Handler function that receives validated input and league user */
  handler: (validated: T, leagueUser: LeagueUser) => Promise<R>
  /** Path to revalidate after successful execution */
  revalidatePath: string
}

/**
 * Execute a user action with standardized error handling, validation, league membership check, and revalidation.
 * Reduces code duplication across all user server actions.
 *
 * @template T - The validated input type (inferred from Zod schema)
 * @template R - The return type of the handler
 * @param input - Raw input data to validate
 * @param leagueId - League ID for membership validation
 * @param options - Configuration object including validator, handler, and revalidation path
 * @returns Standard response with success flag and data or error message
 *
 * @example
 * ```typescript
 * return executeUserAction(input, input.leagueId, {
 *   validator: userMatchBetSchema,
 *   handler: async (validated, leagueUser) => {
 *     await prisma.userBet.create({ data: { ...validated, leagueUserId: leagueUser.id } })
 *     return {}
 *   },
 *   revalidatePath: `/${validated.leagueId}/matches`,
 * })
 * ```
 */
export async function executeUserAction<T, R extends Record<string, unknown>>(
  input: unknown,
  leagueId: number,
  options: UserActionOptions<T, R>,
) {
  try {
    // League membership validation
    const { leagueUser } = await requireLeagueMember(leagueId)

    // Input validation
    const validated = options.validator.parse(input)

    // Execute handler
    const result = await options.handler(validated, leagueUser)

    // Revalidate cache
    revalidatePath(options.revalidatePath)

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Operation failed'),
    }
  }
}
