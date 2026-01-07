import crypto from 'crypto';

/**
 * Generate a cryptographically secure token using crypto.randomBytes
 * Returns a 64-character hexadecimal string (256 bits)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256
 * Never store plain tokens in the database; always hash them first
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check if a token has expired
 * Returns true if expiresAt is in the past
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Create a token expiration timestamp (1 hour from now)
 */
export function getTokenExpirationTime(hoursFromNow: number = 1): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hoursFromNow);
  return expiresAt;
}
