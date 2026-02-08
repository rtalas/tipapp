import { prisma } from '@/lib/prisma';

const MAX_PASSWORD_RESET_ATTEMPTS = 10;
const RATE_LIMIT_WINDOW_HOURS = 1;

// ===== In-Memory IP Rate Limiter =====
// NOTE: This Map resets on every serverless cold start and is per-instance,
// so on Vercel these limits are best-effort only. Acceptable for a small
// friends app; swap to Redis/Upstash if stronger guarantees are needed.

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup(maxWindowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      entry.timestamps = entry.timestamps.filter(t => now - t < maxWindowMs);
      if (entry.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't block process exit
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export const REGISTER_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
};

function isRateLimited(key: string, config: RateLimitConfig): { limited: boolean; remaining: number; retryAfterMs: number } {
  startCleanup(Math.max(LOGIN_RATE_LIMIT.windowMs, REGISTER_RATE_LIMIT.windowMs));

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { limited: false, remaining: config.maxAttempts, retryAfterMs: 0 };
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxAttempts) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return { limited: true, remaining: 0, retryAfterMs };
  }

  return { limited: false, remaining: config.maxAttempts - entry.timestamps.length, retryAfterMs: 0 };
}

function recordRateLimitAttempt(key: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (entry) {
    entry.timestamps.push(now);
  } else {
    rateLimitStore.set(key, { timestamps: [now] });
  }
}

export function getClientIp(request: Request): string {
  // Prefer x-real-ip (set by Vercel, not spoofable) over x-forwarded-for
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

export function checkLoginRateLimit(ip: string): { limited: boolean; remaining: number; retryAfterMs: number } {
  return isRateLimited(`login:${ip}`, LOGIN_RATE_LIMIT);
}

export function recordFailedLogin(ip: string) {
  recordRateLimitAttempt(`login:${ip}`);
}

export function checkRegistrationRateLimit(ip: string): { limited: boolean; remaining: number; retryAfterMs: number } {
  const key = `register:${ip}`;
  const result = isRateLimited(key, REGISTER_RATE_LIMIT);
  if (!result.limited) recordRateLimitAttempt(key);
  return result;
}

/** Exported for testing only */
export function _resetRateLimitStore() {
  rateLimitStore.clear();
}

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

