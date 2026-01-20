'use server'

import { revalidatePath } from 'next/cache'
import type { Session } from 'next-auth'
import { ZodSchema } from 'zod'
import { requireAdmin } from './auth-utils'
import { getErrorMessage } from './error-handler'

export interface ServerActionOptions {
  validator: ZodSchema
  handler: (validated: any, session?: Session | null) => Promise<any>
  revalidatePath: string
  requiresAdmin?: boolean
}

/**
 * Execute a server action with standardized error handling, validation, and revalidation
 * Reduces code duplication across all admin server actions
 *
 * @param input Raw input data to validate
 * @param options Configuration object
 * @returns Standard response with success flag and data or error message
 */
export async function executeServerAction(
  input: unknown,
  options: ServerActionOptions,
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
