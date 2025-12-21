import { describe, it, expect } from 'vitest';
import { registerSchema, signInSchema } from '@/lib/validation';

describe('Zod Validation Schemas - Real', () => {
  describe('registerSchema - Valid Data', () => {
    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe123',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(result.success).toBe(true);
    });

    it('should accept usernames with underscores and hyphens', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'john_doe-123',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema - Invalid Data', () => {
    it('should reject missing firstName', () => {
      const result = registerSchema.safeParse({
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('firstName');
      }
    });

    it('should reject invalid email format', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'not-an-email',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('email');
      }
    });

    it('should reject username shorter than 3 characters', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'ab',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'Short1',
        confirmPassword: 'Short1',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase letter', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'lowercase123',
        confirmPassword: 'lowercase123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase letter', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'UPPERCASE123',
        confirmPassword: 'UPPERCASE123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'NoNumbers',
        confirmPassword: 'NoNumbers',
      });

      expect(result.success).toBe(false);
    });

    it('should reject mismatched password confirmation', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('confirmPassword');
      }
    });

    it('should reject username with special characters', () => {
      const result = registerSchema.safeParse({
        firstName: 'John',
        lastName: 'Doe',
        username: 'john@doe!',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema - Valid Data', () => {
    it('should accept valid credentials with username', () => {
      const result = signInSchema.safeParse({
        username: 'johndoe',
        password: 'any-password-123',
      });

      expect(result.success).toBe(true);
    });

    it('should accept email as username', () => {
      const result = signInSchema.safeParse({
        username: 'john@example.com',
        password: 'any-password-123',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('signInSchema - Invalid Data', () => {
    it('should reject missing username', () => {
      const result = signInSchema.safeParse({
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = signInSchema.safeParse({
        username: 'johndoe',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty username', () => {
      const result = signInSchema.safeParse({
        username: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = signInSchema.safeParse({
        username: 'johndoe',
        password: '',
      });

      expect(result.success).toBe(false);
    });
  });
});
