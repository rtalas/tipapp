/**
 * Client-side validation utilities that mirror server-side Zod schemas
 * This prevents duplication of validation logic between client and server
 * Use these in components for immediate feedback before sending to server
 */

import {
  createTeamSchema,
  updateTeamSchema,
  createPlayerSchema,
  updatePlayerSchema,
  createUserBetSchema,
  updateUserBetSchema,
  createSeriesSchema,
  updateSeriesResultSchema,
  createUserSeriesBetSchema,
  updateUserSeriesBetSchema,
  createSpecialBetSchema,
  updateSpecialBetResultSchema,
  createUserSpecialBetSchema,
  updateUserSpecialBetSchema,
} from './validation/admin'
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from './validation'

/**
 * Validates team edit form data
 * Returns validation result with detailed error information
 */
export function validateTeamEdit(data: unknown) {
  return updateTeamSchema.safeParse(data)
}

/**
 * Validates team creation form data
 */
export function validateTeamCreate(data: unknown) {
  return createTeamSchema.safeParse(data)
}

/**
 * Validates player edit form data
 */
export function validatePlayerEdit(data: unknown) {
  return updatePlayerSchema.safeParse(data)
}

/**
 * Validates player creation form data
 */
export function validatePlayerCreate(data: unknown) {
  return createPlayerSchema.safeParse(data)
}

/**
 * Gets first validation error message for a field
 * Useful for displaying inline field-level errors
 */
export function getFieldError(field: string, validationResult: ReturnType<typeof validateTeamEdit>): string | undefined {
  if (validationResult.success) return undefined

  const issues = validationResult.error.issues || []
  for (const issue of issues) {
    if (issue.path.join('.') === field) {
      return issue.message
    }
  }

  return undefined
}

/**
 * Gets all validation errors grouped by field
 */
export function getFieldErrors(validationResult: ReturnType<typeof validateTeamEdit>): Record<string, string> {
  if (validationResult.success) return {}

  const errors: Record<string, string> = {}
  const issues = validationResult.error.issues || []
  for (const issue of issues) {
    const field = issue.path.join('.')
    errors[field] = issue.message
  }
  return errors
}

/**
 * Validates forgot password form data
 */
export function validateForgotPassword(data: unknown) {
  return forgotPasswordSchema.safeParse(data)
}

/**
 * Validates reset password form data
 */
export function validateResetPassword(data: unknown) {
  return resetPasswordSchema.safeParse(data)
}

/**
 * Validates user bet creation form data
 */
export function validateUserBetCreate(data: unknown) {
  return createUserBetSchema.safeParse(data)
}

/**
 * Validates user bet edit form data
 */
export function validateUserBetEdit(data: unknown) {
  return updateUserBetSchema.safeParse(data)
}

/**
 * Validates series creation form data
 */
export function validateSeriesCreate(data: unknown) {
  return createSeriesSchema.safeParse(data)
}

/**
 * Validates series result entry form data
 */
export function validateSeriesEdit(data: unknown) {
  return updateSeriesResultSchema.safeParse(data)
}

/**
 * Validates user series bet creation form data
 */
export function validateUserSeriesBetCreate(data: unknown) {
  return createUserSeriesBetSchema.safeParse(data)
}

/**
 * Validates user series bet edit form data
 */
export function validateUserSeriesBetEdit(data: unknown) {
  return updateUserSeriesBetSchema.safeParse(data)
}

/**
 * Validates special bet creation form data
 */
export function validateSpecialBetCreate(data: unknown) {
  return createSpecialBetSchema.safeParse(data)
}

/**
 * Validates special bet result entry form data
 */
export function validateSpecialBetEdit(data: unknown) {
  return updateSpecialBetResultSchema.safeParse(data)
}

/**
 * Validates user special bet creation form data
 */
export function validateUserSpecialBetCreate(data: unknown) {
  return createUserSpecialBetSchema.safeParse(data)
}

/**
 * Validates user special bet edit form data
 */
export function validateUserSpecialBetEdit(data: unknown) {
  return updateUserSpecialBetSchema.safeParse(data)
}
