import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendPasswordResetEmail } from './email';

// Create a mock for the send function
const mockSend = vi.fn();

// Mock Resend before importing the module
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

describe('Email Utilities', () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      mockSend.mockResolvedValue({
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
      expect(mockSend).toHaveBeenCalled();
    });

    it('should include correct email fields', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg_123456' },
        error: null,
      });

      await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'Jane Doe',
      });

      const callArg = mockSend.mock.calls[0]?.[0];
      expect(callArg).toBeDefined();
      expect(callArg?.to).toBe('user@example.com');
      expect(callArg?.subject).toContain('Reset Your Password');
      expect(callArg?.html).toContain('Jane Doe');
      expect(callArg?.text).toContain('Jane Doe');
    });

    it('should handle email sending errors', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email address' },
      });

      const result = await sendPasswordResetEmail({
        email: 'invalid-email',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send email');
    });

    it('should include reset link in both HTML and plain text', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg_123456' },
        error: null,
      });

      const resetUrl = 'https://www.tipapp.cz/reset-password/abc123def456';
      await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl,
        username: 'User',
      });

      const callArg = mockSend.mock.calls[0]?.[0];
      expect(callArg?.html).toContain(resetUrl);
      expect(callArg?.text).toContain(resetUrl);
    });

    it('should include security warning about expiration', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'msg_123456' },
        error: null,
      });

      await sendPasswordResetEmail({
        email: 'user@example.com',
        resetUrl: 'https://www.tipapp.cz/reset-password/token123',
        username: 'User',
      });

      const callArg = mockSend.mock.calls[0]?.[0];
      expect(callArg?.html).toContain('1 hour');
      expect(callArg?.text).toContain('1 hour');
    });
  });
});
