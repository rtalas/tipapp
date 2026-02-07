import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isPasswordResetRateLimited, getRemainingResetAttempts, getRateLimitConfig } from './rate-limit';
import { prisma } from '@/lib/prisma';

const mockPrisma = vi.mocked(prisma, true);

// Get the actual config values to keep tests in sync with implementation
const { maxAttempts } = getRateLimitConfig();

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
