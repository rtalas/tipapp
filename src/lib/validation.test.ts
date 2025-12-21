import { describe, it, expect } from 'vitest';
import { registerSchema, signInSchema } from '@/lib/validation';
import { z } from 'zod';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should require firstName', () => {
      const data = {
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require lastName', () => {
      const data = {
        firstName: 'John',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require valid email format', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'invalid-email',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require username with minimum 3 characters', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'ab',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require password with minimum 8 characters', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'Short1',
        confirmPassword: 'Short1',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require password with uppercase letter', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'lowercase123',
        confirmPassword: 'lowercase123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require password with number', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'NoNumbers',
        confirmPassword: 'NoNumbers',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require password confirmation to match password', () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    it('should validate correct sign-in data', () => {
      const validData = {
        username: 'johndoe',
        password: 'SecurePass123',
      };

      const result = signInSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should allow email as username', () => {
      const validData = {
        username: 'john@example.com',
        password: 'SecurePass123',
      };

      const result = signInSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should require username', () => {
      const data = {
        password: 'SecurePass123',
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require password', () => {
      const data = {
        username: 'johndoe',
      };

      const result = signInSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
