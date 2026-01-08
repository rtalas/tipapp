/**
 * Unified error handling strategy for the application
 * Provides consistent error classification, messages, and responses across client and server
 */

import { ZodError } from 'zod'
import { AppError, isPrismaError, handlePrismaError, type PrismaError } from './error-handler'

/**
 * Application error codes for standardized error handling
 */
export enum ErrorCode {
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_AUTHENTICATED = 'NOT_AUTHENTICATED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNIQUE_CONSTRAINT_VIOLATED = 'UNIQUE_CONSTRAINT_VIOLATED',
  FOREIGN_KEY_CONSTRAINT_FAILED = 'FOREIGN_KEY_CONSTRAINT_FAILED',

  // Business logic errors
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INVALID_STATE = 'INVALID_STATE',

  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Standardized error response format
 */
export interface ErrorResponseV2 {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
    fieldErrors?: Record<string, string[]>
  }
}

/**
 * Success response format for consistency
 */
export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
}

/**
 * Server action response wrapper
 */
export type ServerActionResponse<T = unknown> = SuccessResponse<T> | ErrorResponseV2

/**
 * Classify error by type and return standardized response
 */
export function classifyAndHandleError(
  error: unknown,
  context?: { action?: string; details?: Record<string, unknown> },
): ErrorResponseV2 {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {}
    error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      if (!fieldErrors[path]) {
        fieldErrors[path] = []
      }
      fieldErrors[path].push(issue.message)
    })

    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        fieldErrors,
      },
    }
  }

  // Handle Prisma errors
  if (isPrismaError(error)) {
    return {
      success: false,
      error: {
        code: mapPrismaErrorCode(error.code),
        message: handlePrismaError(error).message,
      },
    }
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: (error.code as ErrorCode) || ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message,
      },
    }
  }

  // Handle standard Error
  if (error instanceof Error) {
    const errorCode = mapErrorMessageToCode(error.message)

    return {
      success: false,
      error: {
        code: errorCode,
        message: error.message,
        details: context?.details,
      },
    }
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      details: context?.details,
    },
  }
}

/**
 * Map Prisma error codes to our error codes
 */
function mapPrismaErrorCode(prismaCode: string): ErrorCode {
  switch (prismaCode) {
    case 'P2002':
      return ErrorCode.UNIQUE_CONSTRAINT_VIOLATED
    case 'P2003':
      return ErrorCode.FOREIGN_KEY_CONSTRAINT_FAILED
    case 'P2025':
      return ErrorCode.NOT_FOUND
    default:
      return ErrorCode.DATABASE_ERROR
  }
}

/**
 * Infer error code from error message for standard Error objects
 */
function mapErrorMessageToCode(message: string): ErrorCode {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    return ErrorCode.NOT_FOUND
  }

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('not authorized')) {
    return ErrorCode.UNAUTHORIZED
  }

  if (lowerMessage.includes('forbidden') || lowerMessage.includes('not allowed')) {
    return ErrorCode.FORBIDDEN
  }

  if (
    lowerMessage.includes('already exists') ||
    lowerMessage.includes('duplicate') ||
    lowerMessage.includes('already taken')
  ) {
    return ErrorCode.ALREADY_EXISTS
  }

  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return ErrorCode.VALIDATION_ERROR
  }

  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('too many requests')
  ) {
    return ErrorCode.RATE_LIMIT_EXCEEDED
  }

  return ErrorCode.BUSINESS_LOGIC_ERROR
}

/**
 * Get user-friendly error message for UI
 */
export function getUserFriendlyErrorMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again',
    [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
    [ErrorCode.UNAUTHORIZED]: 'You do not have permission to perform this action',
    [ErrorCode.FORBIDDEN]: 'Access denied',
    [ErrorCode.NOT_AUTHENTICATED]: 'Please sign in to continue',
    [ErrorCode.NOT_FOUND]: 'The requested item was not found',
    [ErrorCode.ALREADY_EXISTS]: 'This item already exists',
    [ErrorCode.CONFLICT]: 'There is a conflict with existing data',
    [ErrorCode.DATABASE_ERROR]: 'A database error occurred',
    [ErrorCode.UNIQUE_CONSTRAINT_VIOLATED]: 'This value is already in use',
    [ErrorCode.FOREIGN_KEY_CONSTRAINT_FAILED]: 'Cannot complete this action due to related items',
    [ErrorCode.BUSINESS_LOGIC_ERROR]: 'An error occurred while processing your request',
    [ErrorCode.OPERATION_NOT_ALLOWED]: 'This operation is not allowed',
    [ErrorCode.INVALID_STATE]: 'Item is in an invalid state for this operation',
    [ErrorCode.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',
    [ErrorCode.TIMEOUT]: 'Request took too long',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'An external service error occurred',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
  }

  return messages[code] || 'An unexpected error occurred'
}
