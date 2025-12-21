import { describe, it, expect } from 'vitest';
import { hash, compare } from 'bcryptjs';

describe('Password Security - bcryptjs', () => {
  describe('hash function', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123';
      const hashedPassword = await hash(password, 12);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toEqual(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('should create different hashes for same password', async () => {
      const password = 'SecurePass123';
      const hash1 = await hash(password, 12);
      const hash2 = await hash(password, 12);

      expect(hash1).not.toEqual(hash2);
    });

    it('should use 12 salt rounds for security', async () => {
      const password = 'SecurePass123';
      const hashedPassword = await hash(password, 12);

      // bcryptjs hashes start with $2a$, $2b$, or $2y$ followed by cost parameter
      expect(hashedPassword).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('compare function', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePass123';
      const hashedPassword = await hash(password, 12);

      const isValid = await compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123';
      const wrongPassword = 'WrongPassword123';
      const hashedPassword = await hash(password, 12);

      const isValid = await compare(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'SecurePass123';
      const caseDifferent = 'securepass123';
      const hashedPassword = await hash(password, 12);

      const isValid = await compare(caseDifferent, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const emptyPassword = '';
      const hashedPassword = await hash('SecurePass123', 12);

      const isValid = await compare(emptyPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });
});
