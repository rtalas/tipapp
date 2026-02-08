import { prisma } from '@/lib/prisma';

const MAX_PASSWORD_RESET_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_HOURS = 1;

async function getRecentAttemptCount(userId: number): Promise<number> {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);

  return prisma.passwordResetToken.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
    },
  });
}

/**
 * Check if a user has exceeded the password reset rate limit.
 * Returns true if the user has made more than MAX_PASSWORD_RESET_ATTEMPTS in the last RATE_LIMIT_WINDOW_HOURS.
 */
export async function isPasswordResetRateLimited(userId: number): Promise<boolean> {
  return (await getRecentAttemptCount(userId)) >= MAX_PASSWORD_RESET_ATTEMPTS;
}

/**
 * Get the number of remaining password reset attempts for a user in the current rate limit window.
 * Returns 0 if rate limited.
 */
export async function getRemainingResetAttempts(userId: number): Promise<number> {
  return Math.max(0, MAX_PASSWORD_RESET_ATTEMPTS - await getRecentAttemptCount(userId));
}

/**
 * Get the reset limit constants.
 */
export function getRateLimitConfig() {
  return {
    maxAttempts: MAX_PASSWORD_RESET_ATTEMPTS,
    windowHours: RATE_LIMIT_WINDOW_HOURS,
  };
}
