import { ZodError } from 'zod'

/**
 * Custom error class for application-level errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string = 'UNKNOWN_ERROR',
    readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Standardized error response for actions
 */
export interface ErrorResponse {
  message: string
  code: string
  fieldErrors?: Record<string, string[]>
}

/**
 * Handles and normalizes errors from server actions and API calls
 *
 * @param error - The error to handle
 * @param defaultMessage - Default message if error type is unknown
 * @returns Standardized error response
 */
export function handleActionError(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred',
): ErrorResponse {
  // Handle ZodError (validation errors)
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {}
    const issues = error.issues || []
    issues.forEach((issue) => {
      const path = issue.path.join('.')
      if (!fieldErrors[path]) {
        fieldErrors[path] = []
      }
      fieldErrors[path].push(issue.message)
    })
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fieldErrors,
    }
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
    }
  }

  // Handle standard Error
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    }
  }

  // Handle unknown error types
  return {
    message: defaultMessage,
    code: 'UNKNOWN_ERROR',
  }
}

/**
 * Extracts the first user-friendly error message from an error
 * Useful for displaying a single error message in UI
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  const errorResponse = handleActionError(error, defaultMessage)
  return errorResponse.message
}

/**
 * Logs error details for debugging/monitoring
 * Can be extended to send to external logging service
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', {
      error,
      context,
      timestamp: new Date().toISOString(),
    })
  }
  // TODO: In production, send to external logging service (Sentry, LogRocket, etc.)
}
