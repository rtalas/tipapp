'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { ZodSchema } from 'zod'
import { requireAdmin } from './auth/auth-utils'
import { getErrorMessage } from './error-handler'

/**
 * Configuration options for server action execution
 * @template T - The validated input type (inferred from Zod schema)
 * @template R - The return type of the handler (defaults to Record<string, unknown>)
 */
export interface ServerActionOptions<T, R = Record<string, unknown>> {
  /** Zod schema for validating input */
  validator: ZodSchema<T>
  /** Handler function that receives validated input and optional session */
  handler: (validated: T, session?: Session | null) => Promise<R>
  /** Path to revalidate after successful execution */
  revalidatePath: string
  /** Whether admin authorization is required (default: false) */
  requiresAdmin?: boolean
}

/**
 * Execute a server action with standardized error handling, validation, and revalidation.
 * Reduces code duplication across all admin server actions.
 *
 * @template T - The validated input type (inferred from Zod schema)
 * @template R - The return type of the handler
 * @param input - Raw input data to validate
 * @param options - Configuration object including validator, handler, and revalidation path
 * @returns Standard response with success flag and data or error message
 *
 * @example
 * ```typescript
 * return executeServerAction(input, {
 *   validator: createTeamSchema,
 *   handler: async (validated) => {
 *     const team = await prisma.team.create({ data: validated })
 *     return { teamId: team.id }
 *   },
 *   revalidatePath: '/admin/teams',
 *   requiresAdmin: true,
 * })
 * ```
 */
export async function executeServerAction<T, R extends Record<string, unknown>>(
  input: unknown,
  options: ServerActionOptions<T, R>,
) {
  try {
    // Authorization check (returns session if admin required)
    let session: Session | null = null
    if (options.requiresAdmin) {
      session = await requireAdmin()
    }

    // Validation
    const validated = options.validator.parse(input)

    // Handler logic (pass session for audit trail purposes)
    const result = await options.handler(validated, session)

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
