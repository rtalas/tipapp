/**
 * Authentication Validation Schemas
 *
 * Zod schemas for validating user authentication inputs:
 * - User registration (with password strength requirements)
 * - Sign in (username/email + password)
 * - Password reset flow
 *
 * @module validation
 * @example
 * ```typescript
 * import { registerSchema, RegisterFormInput } from '@/lib/validation'
 *
 * const result = registerSchema.safeParse(formData)
 * if (!result.success) {
 *   // Handle validation errors
 * }
 * ```
 */
import { z } from "zod";

/**
 * Registration form validation
 * Requires: firstName, lastName, username, email, password, confirmPassword
 * Password must be 8+ chars with uppercase, lowercase, and number
 */
export const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().min(1, "Last name is required").max(255),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(255, "Username must be less than 255 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email("Invalid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address").max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").length(64, "Invalid reset token format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
