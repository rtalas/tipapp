import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestPasswordReset, resetPassword } from './password-reset';
import { prisma } from '@/lib/prisma';
import * as emailModule from '@/lib/email/email';
import * as rateLimitModule from '@/lib/rate-limit';

// Mock dependencies
vi.mock('@/lib/email/email', () => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  isPasswordResetRateLimited: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password_123'),
  },
}));

const mockPrisma = vi.mocked(prisma, true);
const mockSendEmail = vi.mocked(emailModule.sendPasswordResetEmail);
const mockRateLimit = vi.mocked(rateLimitModule.isPasswordResetRateLimited);

describe('Password Reset Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('should return success message for valid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        username: 'john',
      } as any);

      mockRateLimit.mockResolvedValue(false);
      mockPrisma.passwordResetToken.create.mockResolvedValue({} as any);
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg_123' });

      const result = await requestPasswordReset({ email: 'user@example.com' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link');
    });

    it('should return generic success for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await requestPasswordReset({ email: 'nonexistent@example.com' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link');
    });

    it('should return generic success when rate limited', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        username: 'john',
      } as any);

      mockRateLimit.mockResolvedValue(true);

      const result = await requestPasswordReset({ email: 'user@example.com' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link');
    });

    it('should validate email format', async () => {
      const result = await requestPasswordReset({ email: 'invalid-email' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link');
    });

    it('should handle missing email', async () => {
      const result = await requestPasswordReset({ email: '' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('password reset link');
    });

    it('should create password reset token with correct hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 42,
        email: 'user@example.com',
        firstName: 'John',
        username: 'john',
      } as any);

      mockRateLimit.mockResolvedValue(false);
      mockPrisma.passwordResetToken.create.mockResolvedValue({} as any);
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg_123' });

      await requestPasswordReset({ email: 'user@example.com' });

      expect(mockPrisma.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 42,
            token: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    it('should send email with reset link', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        username: 'john',
      } as any);

      mockRateLimit.mockResolvedValue(false);
      mockPrisma.passwordResetToken.create.mockResolvedValue({} as any);
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg_123' });

      await requestPasswordReset({ email: 'user@example.com' });

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          resetUrl: expect.stringContaining('/reset-password/'),
          username: 'John',
        })
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockUser = { id: 1, email: 'user@example.com' };
      const mockToken = {
        id: 1,
        userId: 1,
        token: 'hashed_token',
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now
        usedAt: null,
        createdAt: new Date(),
        User: mockUser,
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockToken as any);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      const result = await resetPassword({
        token: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 64 chars
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('reset successfully');
    });

    it('should reject invalid token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const result = await resetPassword({
        token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // 64 chars
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toContain('Invalid or expired');
    });

    it('should reject expired token', async () => {
      const mockToken = {
        id: 1,
        userId: 1,
        token: 'hashed_token',
        expiresAt: new Date(Date.now() - 60000), // 1 minute ago
        usedAt: null,
        createdAt: new Date(),
        User: { id: 1, email: 'user@example.com' },
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockToken as any);

      const result = await resetPassword({
        token: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', // 64 chars
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toContain('expired');
    });

    it('should reject already used token', async () => {
      const mockToken = {
        id: 1,
        userId: 1,
        token: 'hashed_token',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: new Date(), // Already used
        createdAt: new Date(),
        User: { id: 1, email: 'user@example.com' },
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockToken as any);

      const result = await resetPassword({
        token: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', // 64 chars
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toContain('already been used');
    });

    it('should validate password requirements', async () => {
      const result = await resetPassword({
        token: 'token_1234567890123456789012345678901234567890123456789012345678901234',
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toBeDefined();
    });

    it('should validate password confirmation', async () => {
      const result = await resetPassword({
        token: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd', // 64 chars
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toContain("don't match");
    });

    it('should use atomic transaction', async () => {
      const mockToken = {
        id: 1,
        userId: 1,
        token: 'hashed_token',
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        createdAt: new Date(),
        User: { id: 1, email: 'user@example.com' },
      };

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(mockToken as any);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      await resetPassword({
        token: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // 64 chars
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
      const transactionCalls = (mockPrisma.$transaction.mock.calls[0][0] as unknown as any[]);
      expect(transactionCalls.length).toBe(3); // Update user, mark token used, delete others
    });
  });
});
