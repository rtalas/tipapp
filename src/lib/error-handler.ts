/**
 * Centralized Error Handling Utilities
 *
 * Provides standardized error handling across the application:
 * - Type guards for Prisma errors
 * - Custom AppError class for business logic errors
 * - Error normalization for consistent API responses
 * - User-friendly error message extraction
 * - Production-safe error logging
 *
 * @module error-handler
 * @example
 * ```typescript
 * try {
 *   await someOperation()
 * } catch (error) {
 *   const message = getErrorMessage(error, 'Operation failed')
 *   logError(error, { operation: 'someOperation' })
 *   return { success: false, error: message }
 * }
 * ```
 */
import { ZodError } from 'zod'

/**
 * Type guard for Prisma database errors
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 */
export interface PrismaError {
  code: string
  meta?: {
    target?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function isPrismaError(error: unknown): error is PrismaError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  )
}

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
    // Use the first error message as the main message for better UX
    const firstError = issues[0]?.message || 'Validation failed'
    return {
      message: firstError,
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
 * Handles Prisma-specific errors with type safety
 * Translates Prisma error codes to user-friendly messages
 */
export function handlePrismaError(error: PrismaError): ErrorResponse {
  switch (error.code) {
    case 'P2002': {
      // Unique constraint violation
      const field = error.meta?.target?.[0]
      const fieldName = field ? `"${field}"` : 'This field'
      return {
        message: `${fieldName} already exists`,
        code: 'UNIQUE_CONSTRAINT_VIOLATED',
      }
    }
    case 'P2025':
      return {
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND',
      }
    case 'P2003':
      return {
        message: 'Referenced record not found',
        code: 'FOREIGN_KEY_CONSTRAINT_FAILED',
      }
    default:
      return {
        message: `Database error: ${error.code}`,
        code: error.code,
      }
  }
}

/**
 * Logs error details for debugging/monitoring
 * In development: logs to console
 * In production: logs to console (stdout) - integrate with Sentry/LogRocket for external service
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString()
  const errorData = {
    error,
    context,
    timestamp,
    environment: process.env.NODE_ENV,
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', errorData)
  } else {
    // PRODUCTION: Always log errors to stdout/stderr
    // This ensures visibility in production logs/monitoring systems
    console.error('[PROD_ERROR]', errorData)

    // TODO: Integrate with external logging service (Sentry, LogRocket, etc.)
    // Example integration (when ready):
    // try {
    //   Sentry.captureException(error, {
    //     contexts: { custom: context },
    //     level: 'error',
    //   })
    // } catch (sentryError) {
    //   console.error('[SENTRY_FAILURE]', sentryError)
    // }
  }
}
