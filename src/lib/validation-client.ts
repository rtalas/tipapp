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
} from './validation/admin'

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
