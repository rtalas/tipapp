/**
 * Client-side validation utilities that mirror server-side Zod schemas.
 * Use these in components for immediate feedback before sending to server.
 *
 * @example
 * ```ts
 * const result = validate.teamEdit(formData)
 * if (!result.success) {
 *   console.error(result.error)
 * }
 * ```
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
 * Centralized validation namespace for client-side form validation.
 * All validators return Zod's SafeParseReturnType with success flag and data/error.
 */
export const validate = {
  teamEdit: (data: unknown) => updateTeamSchema.safeParse(data),
  teamCreate: (data: unknown) => createTeamSchema.safeParse(data),
  playerEdit: (data: unknown) => updatePlayerSchema.safeParse(data),
  playerCreate: (data: unknown) => createPlayerSchema.safeParse(data),
  forgotPassword: (data: unknown) => forgotPasswordSchema.safeParse(data),
  resetPassword: (data: unknown) => resetPasswordSchema.safeParse(data),
  userBetCreate: (data: unknown) => createUserBetSchema.safeParse(data),
  userBetEdit: (data: unknown) => updateUserBetSchema.safeParse(data),
  userSeriesBetCreate: (data: unknown) => createUserSeriesBetSchema.safeParse(data),
  userSeriesBetEdit: (data: unknown) => updateUserSeriesBetSchema.safeParse(data),
  userSpecialBetCreate: (data: unknown) => createUserSpecialBetSchema.safeParse(data),
  userSpecialBetEdit: (data: unknown) => updateUserSpecialBetSchema.safeParse(data),
  questionEdit: (data: unknown) => updateQuestionSchema.safeParse(data),
  userQuestionBetCreate: (data: unknown) => createUserQuestionBetSchema.safeParse(data),
  userQuestionBetEdit: (data: unknown) => updateUserQuestionBetSchema.safeParse(data),
} as const

// Legacy named exports for backwards compatibility (use `validate` namespace instead)
/** @deprecated Use `validate.teamEdit` instead */
export const validateTeamEdit = validate.teamEdit
/** @deprecated Use `validate.teamCreate` instead */
export const validateTeamCreate = validate.teamCreate
/** @deprecated Use `validate.playerEdit` instead */
export const validatePlayerEdit = validate.playerEdit
/** @deprecated Use `validate.playerCreate` instead */
export const validatePlayerCreate = validate.playerCreate
/** @deprecated Use `validate.forgotPassword` instead */
export const validateForgotPassword = validate.forgotPassword
/** @deprecated Use `validate.resetPassword` instead */
export const validateResetPassword = validate.resetPassword
/** @deprecated Use `validate.userBetCreate` instead */
export const validateUserBetCreate = validate.userBetCreate
/** @deprecated Use `validate.userBetEdit` instead */
export const validateUserBetEdit = validate.userBetEdit
/** @deprecated Use `validate.userSeriesBetCreate` instead */
export const validateUserSeriesBetCreate = validate.userSeriesBetCreate
/** @deprecated Use `validate.userSeriesBetEdit` instead */
export const validateUserSeriesBetEdit = validate.userSeriesBetEdit
/** @deprecated Use `validate.userSpecialBetCreate` instead */
export const validateUserSpecialBetCreate = validate.userSpecialBetCreate
/** @deprecated Use `validate.userSpecialBetEdit` instead */
export const validateUserSpecialBetEdit = validate.userSpecialBetEdit
/** @deprecated Use `validate.questionEdit` instead */
export const validateQuestionEdit = validate.questionEdit
/** @deprecated Use `validate.userQuestionBetCreate` instead */
export const validateUserQuestionBetCreate = validate.userQuestionBetCreate
/** @deprecated Use `validate.userQuestionBetEdit` instead */
export const validateUserQuestionBetEdit = validate.userQuestionBetEdit
