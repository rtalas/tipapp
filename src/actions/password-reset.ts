'use server';

import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validation';
import { generateSecureToken, hashToken, isTokenExpired, getTokenExpirationTime } from '@/lib/token-utils';
import { isPasswordResetRateLimited } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email/email';
import { AppError, handleActionError, logError } from '@/lib/error-handler';
import bcryptjs from 'bcryptjs';
import { AuditLogger } from '@/lib/logging/audit-logger';

const APP_URL = env.APP_URL;

/**
 * Request a password reset by email
 * Generates a secure token, saves it to the database, and sends an email
 *
 * Security considerations:
 * - Always returns success message to prevent email enumeration attacks
 * - Rate limits to 3 requests per email per hour
 * - Tokens are hashed before storage (never store plain tokens)
 * - Tokens expire after 1 hour
 */
export async function requestPasswordReset(
  formData: unknown,
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(formData);
    if (!validationResult.success) {
      // Don't expose validation errors for security (prevent email enumeration)
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    const { email } = validationResult.data;

    try {
      // Find user by email (case-insensitive)
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        // Return generic success message to prevent email enumeration
        logError('Password reset requested for non-existent email', { email });
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Check rate limit (3 requests per hour)
      const isRateLimited = await isPasswordResetRateLimited(user.id);
      if (isRateLimited) {
        logError('Password reset rate limit exceeded', { userId: user.id, email });
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      // Generate secure token (64-char hex)
      const plainToken = generateSecureToken();
      const hashedToken = hashToken(plainToken);

      // Create password reset token in database
      const expiresAt = getTokenExpirationTime(1); // 1 hour from now

      const resetToken = await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
          createdAt: new Date(),
        },
      });

      // Audit log password reset request (fire-and-forget)
      AuditLogger.passwordResetRequested(
        user.id,
        user.email,
        resetToken.id
      ).catch((err) => console.error("Audit log failed:", err));

      // Generate reset URL
      const resetUrl = `${APP_URL}/reset-password/${plainToken}`;

      // Send email
      const emailResult = await sendPasswordResetEmail({
        email: user.email,
        resetUrl,
        username: user.firstName || user.username,
      });

      if (!emailResult.success) {
        logError('Failed to send password reset email', {
          userId: user.id,
          email,
          error: emailResult.error,
        });
        // Still return success to prevent email enumeration
        return {
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        };
      }

      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    } catch (dbError) {
      logError('requestPasswordReset database error', { error: dbError, email });
      // Always return generic success for security
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }
  } catch (error) {
    logError('requestPasswordReset outer error', { error });
    // Always return generic success for security
    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }
}

/**
 * Reset password using a reset token
 * Verifies the token validity and updates the user's password
 *
 * Security considerations:
 * - Token must be valid (not expired, exists, not used)
 * - Uses atomic transaction to ensure consistency
 * - Password is hashed with bcryptjs (12 rounds) before storage
 * - Token is marked as used to prevent reuse
 * - All other reset tokens for the user are deleted
 */
export async function resetPassword(
  formData: unknown,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(formData);
    if (!validationResult.success) {
      const fieldErrors = handleActionError(validationResult.error);
      return {
        success: false,
        error: fieldErrors.message,
      };
    }

    const { token, password } = validationResult.data;

    // Hash the incoming token for database lookup
    const hashedToken = hashToken(token);

    // Find reset token in database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { User: true },
    });

    if (!resetToken) {
      throw new AppError(
        'Invalid or expired reset link. Please request a new password reset.',
        'INVALID_TOKEN',
        400,
      );
    }

    // Check if token has been used
    if (resetToken.usedAt) {
      throw new AppError(
        'This reset link has already been used. Please request a new password reset.',
        'TOKEN_ALREADY_USED',
        400,
      );
    }

    // Check if token is expired
    if (isTokenExpired(resetToken.expiresAt)) {
      throw new AppError(
        'This reset link has expired. Please request a new password reset.',
        'TOKEN_EXPIRED',
        400,
      );
    }

    // Hash the new password
    const hashedPassword = await bcryptjs.hash(password, 12);

    // Update password and mark token as used in atomic transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
        },
      }),
      prisma.passwordResetToken.update({
        where: { token: hashedToken },
        data: {
          usedAt: new Date(),
        },
      }),
      // Delete all reset tokens for this user (cleanup after successful reset)
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),
    ]);

    // Audit log successful password reset (fire-and-forget)
    AuditLogger.passwordResetCompleted(
      resetToken.userId,
      resetToken.User.email
    ).catch((err) => console.error("Audit log failed:", err));

    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  } catch (error) {
    // Audit log failed password reset (fire-and-forget)
    if (error instanceof AppError) {
      AuditLogger.passwordResetFailed(error.message, {
        code: error.code,
      }).catch((err) => console.error("Audit log failed:", err));
    }

    const errorResponse = handleActionError(
      error,
      'An error occurred while resetting your password. Please try again.',
    );
    return {
      success: false,
      error: errorResponse.message,
    };
  }
}
