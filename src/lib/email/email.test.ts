import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create hoisted mock with function implementation
const sendMock = vi.hoisted(() => vi.fn<(...args: any[]) => any>());

vi.mock('resend', () => ({
  Resend: vi.fn(function() {
    return {
      emails: {
        send: sendMock,
      },
    }
  }),
}));

import { sendPasswordResetEmail } from './email';

describe('Email Utilities', () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      sendMock.mockResolvedValue({
        data: { id: 'msg_123456' },
        error: null,
      });

      const result = await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl: 'https://www.tipapp.cz/reset-password/abcd1234',
        username: 'John Doe',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123456');
      expect(sendMock).toHaveBeenCalled();
    });

    it('should include correct email fields', async () => {
      sendMock.mockResolvedValue({
        data: { id: 'msg_123456' },
        error: null,
      });

      await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'Jane Doe',
      });

      const callArg = sendMock.mock.calls[0]?.[0];
      expect(callArg).toBeDefined();
      expect(callArg?.to).toBe('user@example.com');
      expect(callArg?.subject).toContain('Reset Your Password');
      expect(callArg?.html).toContain('Jane Doe');
      expect(callArg?.text).toContain('Jane Doe');
    });

    it('should handle email sending errors', async () => {
      sendMock.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email address' },
      });

      const result = await sendPasswordResetEmail({
        email: 'invalid-email',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'User',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toBe('Invalid email address');
    });

    it('should handle unexpected errors gracefully', async () => {
      sendMock.mockRejectedValue(new Error('Network error'));

      const result = await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'User',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toBe('Failed to send email');
    });

    it('should include reset link in both HTML and plain text', async () => {
      sendMock.mockResolvedValue({
        data: { id: 'msg_123456' },
        error: null,
      });

      const resetUrl = 'https://www.tipapp.cz/reset-password/abc123def456';
      await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl,
        username: 'User',
      });

      const callArg = sendMock.mock.calls[0]?.[0];
      expect(callArg?.html).toContain(resetUrl);
      expect(callArg?.text).toContain(resetUrl);
    });

    it('should include security warning about expiration', async () => {
      sendMock.mockResolvedValue({
        data: { id: 'msg_123456' },
        error: null,
      });

      await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'User',
      });

      const callArg = sendMock.mock.calls[0]?.[0];
      expect(callArg?.html).toContain('1 hour');
      expect(callArg?.text).toContain('1 hour');
    });
  });
});
