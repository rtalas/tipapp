/**
 * Server Action wrapper for automatic error handling and logging
 * Wraps server actions with try-catch, error logging, and standardized error responses
 */

import { logError } from './error-handler'

/**
 * Type for server action result
 */
export interface ServerActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Wraps a server action function with automatic error handling
 * - Catches all errors (Prisma, validation, async, etc.)
 * - Logs errors for debugging
 * - Returns standardized error response
 *
 * Usage:
 * ```ts
 * export const createUser = withServerAction(async (input) => {
 *   const user = await prisma.user.create({ data: input })
 *   return user
 * })
 * ```
 */
export function withServerAction<TInput, TOutput>(
  action: (input: TInput) => Promise<TOutput>,
  actionName?: string,
): (input: TInput) => Promise<ServerActionResult<TOutput>> {
  return async (input: TInput) => {
    try {
      const result = await action(input)
      return {
        success: true,
        data: result,
      }
    } catch (error) {
      const name = actionName || action.name || 'unknown action'
      logError(error, { action: name, input })

      // Extract user-friendly error message
      let errorMessage = 'An unexpected error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

/**
 * Simple error boundary for direct server action execution
 * Use this for server actions that throw on error (don't return ServerActionResult)
 */
export async function executeServerAction<T>(
  fn: () => Promise<T>,
  actionName?: string,
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await fn()
    return { success: true, data: result }
  } catch (error) {
    const name = actionName || fn.name || 'unknown action'
    logError(error, { action: name })

    let errorMessage = 'An unexpected error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    return { success: false, error: errorMessage }
  }
}
