import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isPasswordResetRateLimited,
  getRemainingResetAttempts,
  getRateLimitConfig,
  checkLoginRateLimit,
  checkRegistrationRateLimit,
  getClientIp,
  _resetRateLimitStore,
  LOGIN_RATE_LIMIT,
  REGISTER_RATE_LIMIT,
} from './rate-limit';
import { prisma } from '@/lib/prisma';

const mockPrisma = vi.mocked(prisma, true);

// Get the actual config values to keep tests in sync with implementation
const { maxAttempts } = getRateLimitConfig();

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRateLimitStore();
  });

  describe('isPasswordResetRateLimited', () => {
    it('should return false if user has fewer than max attempts', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(maxAttempts - 1);

      const result = await isPasswordResetRateLimited(123);
      expect(result).toBe(false);
    });

    it('should return true if user has exactly max attempts', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(maxAttempts);

      const result = await isPasswordResetRateLimited(123);
      expect(result).toBe(true);
    });

    it('should return true if user has more than max attempts', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(maxAttempts + 5);

      const result = await isPasswordResetRateLimited(123);
      expect(result).toBe(true);
    });

    it('should query for tokens created in the last hour', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(1);

      await isPasswordResetRateLimited(456);

      expect(mockPrisma.passwordResetToken.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 456,
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe('getRemainingResetAttempts', () => {
    it('should return maxAttempts if user has no recent attempts', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(0);

      const result = await getRemainingResetAttempts(123);
      expect(result).toBe(maxAttempts);
    });

    it('should return maxAttempts - 1 if user has 1 recent attempt', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(1);

      const result = await getRemainingResetAttempts(123);
      expect(result).toBe(maxAttempts - 1);
    });

    it('should return maxAttempts - 2 if user has 2 recent attempts', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(2);

      const result = await getRemainingResetAttempts(123);
      expect(result).toBe(maxAttempts - 2);
    });

    it('should return 0 if user has reached max attempts', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(maxAttempts);

      const result = await getRemainingResetAttempts(123);
      expect(result).toBe(0);
    });

    it('should return 0 (not negative) if user exceeds limit', async () => {
      mockPrisma.passwordResetToken.count.mockResolvedValue(maxAttempts + 10);

      const result = await getRemainingResetAttempts(123);
      expect(result).toBe(0);
    });
  });

  describe('getRateLimitConfig', () => {
    it('should return the rate limit configuration', () => {
      const config = getRateLimitConfig();
      expect(config).toEqual({
        maxAttempts: 10,
        windowHours: 1,
      });
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      });
      expect(getClientIp(request)).toBe('1.2.3.4');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '10.0.0.1' },
      });
      expect(getClientIp(request)).toBe('10.0.0.1');
    });

    it('should return "unknown" if no IP headers present', () => {
      const request = new Request('http://localhost');
      expect(getClientIp(request)).toBe('unknown');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'x-real-ip': '10.0.0.1',
        },
      });
      expect(getClientIp(request)).toBe('1.2.3.4');
    });
  });

  describe('checkLoginRateLimit', () => {
    it('should allow requests under the limit', () => {
      const result = checkLoginRateLimit('192.168.1.1');
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(LOGIN_RATE_LIMIT.maxAttempts - 1);
    });

    it('should block after exceeding max attempts', () => {
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxAttempts; i++) {
        checkLoginRateLimit('192.168.1.2');
      }
      const result = checkLoginRateLimit('192.168.1.2');
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('should track IPs independently', () => {
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxAttempts; i++) {
        checkLoginRateLimit('10.0.0.1');
      }
      const blockedResult = checkLoginRateLimit('10.0.0.1');
      expect(blockedResult.limited).toBe(true);

      const allowedResult = checkLoginRateLimit('10.0.0.2');
      expect(allowedResult.limited).toBe(false);
    });

    it('should not share limits between login and registration', () => {
      for (let i = 0; i < LOGIN_RATE_LIMIT.maxAttempts; i++) {
        checkLoginRateLimit('10.0.0.3');
      }
      const loginResult = checkLoginRateLimit('10.0.0.3');
      expect(loginResult.limited).toBe(true);

      const registerResult = checkRegistrationRateLimit('10.0.0.3');
      expect(registerResult.limited).toBe(false);
    });
  });

  describe('checkRegistrationRateLimit', () => {
    it('should allow requests under the limit', () => {
      const result = checkRegistrationRateLimit('192.168.1.1');
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(REGISTER_RATE_LIMIT.maxAttempts - 1);
    });

    it('should block after exceeding max attempts', () => {
      for (let i = 0; i < REGISTER_RATE_LIMIT.maxAttempts; i++) {
        checkRegistrationRateLimit('192.168.1.3');
      }
      const result = checkRegistrationRateLimit('192.168.1.3');
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });
  });

  describe('rate limit configs', () => {
    it('should have correct login rate limit config', () => {
      expect(LOGIN_RATE_LIMIT.maxAttempts).toBe(10);
      expect(LOGIN_RATE_LIMIT.windowMs).toBe(15 * 60 * 1000);
    });

    it('should have correct registration rate limit config', () => {
      expect(REGISTER_RATE_LIMIT.maxAttempts).toBe(5);
      expect(REGISTER_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000);
    });
  });
});
