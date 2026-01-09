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
  createUserSeriesBetSchema,
  updateUserSeriesBetSchema,
  createSpecialBetSchema,
  updateSpecialBetResultSchema,
  createUserSpecialBetSchema,
  updateUserSpecialBetSchema,
  updateQuestionSchema,
  createUserQuestionBetSchema,
  updateUserQuestionBetSchema,
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

/**
 * Validates question edit form data
 */
export function validateQuestionEdit(data: unknown) {
  return updateQuestionSchema.safeParse(data)
}

/**
 * Validates user question bet creation form data
 */
export function validateUserQuestionBetCreate(data: unknown) {
  return createUserQuestionBetSchema.safeParse(data)
}

/**
 * Validates user question bet edit form data
 */
export function validateUserQuestionBetEdit(data: unknown) {
  return updateUserQuestionBetSchema.safeParse(data)
}
