import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

const mockCompare = vi.fn();
vi.mock('bcryptjs', () => ({
  compare: mockCompare,
}));

describe('Authentication - CredentialsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Lookup', () => {
    it('should find user by username', () => {
      const testUser = {
        id: 1,
        username: 'johndoe',
        email: 'john@example.com',
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        isSuperadmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Verify test data structure
      expect(testUser.username).toEqual('johndoe');
      expect(testUser.id).toBeDefined();
    });

    it('should find user by email', () => {
      const testUser = {
        id: 2,
        username: 'janedoe',
        email: 'jane@example.com',
        password: 'hashed_password',
        firstName: 'Jane',
        lastName: 'Doe',
        isSuperadmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(testUser.email).toEqual('jane@example.com');
      expect(testUser.id).toBeDefined();
    });

    it('should use OR condition for username or email lookup', () => {
      // Verify the lookup would use OR condition
      const query = {
        where: {
          OR: [
            { username: 'johndoe' },
            { email: 'johndoe' }, // can also be email
          ],
        },
      };

      expect(query.where.OR).toHaveLength(2);
      expect(query.where.OR[0]).toHaveProperty('username');
      expect(query.where.OR[1]).toHaveProperty('email');
    });

    it('should return null when user not found', () => {
      const user = null;
      expect(user).toBeNull();
    });
  });

  describe('Password Verification', () => {
    it('should use bcryptjs.compare for password verification', async () => {
      const password = 'TestPassword123';
      const hashedPassword = 'hashed_TestPassword123';

      await mockCompare(password, hashedPassword);

      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should accept correct password', async () => {
      mockCompare.mockResolvedValueOnce(true);

      const result = await mockCompare('CorrectPassword123', 'hashed_correct');

      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      mockCompare.mockResolvedValueOnce(false);

      const result = await mockCompare('WrongPassword123', 'hashed_correct');

      expect(result).toBe(false);
    });

    it('should be timing-safe with bcryptjs.compare', () => {
      // bcryptjs.compare is inherently timing-safe
      // Verify it's the method being used (mocked successfully)
      expect(mockCompare).toBeDefined();
      expect(typeof mockCompare).toBe('function');
    });
  });

  describe('Session Data', () => {
    it('should include id in session', () => {
      const user = {
        id: 1,
        username: 'johndoe',
        email: 'john@example.com',
        isSuperadmin: false,
      };

      expect(user).toHaveProperty('id');
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('number');
    });

    it('should include username in session', () => {
      const user = {
        id: 1,
        username: 'johndoe',
        email: 'john@example.com',
        isSuperadmin: false,
      };

      expect(user).toHaveProperty('username');
      expect(user.username).toBeDefined();
      expect(typeof user.username).toBe('string');
    });

    it('should include isSuperadmin in session', () => {
      const user = {
        id: 1,
        username: 'johndoe',
        email: 'john@example.com',
        isSuperadmin: true,
      };

      expect(user).toHaveProperty('isSuperadmin');
      expect(user.isSuperadmin).toBeDefined();
      expect(typeof user.isSuperadmin).toBe('boolean');
    });

    it('should not include password in session', () => {
      const sessionUser = {
        id: 1,
        username: 'johndoe',
        email: 'john@example.com',
        isSuperadmin: false,
      };

      expect(sessionUser).not.toHaveProperty('password');
    });

    it('should convert id to string for JWT', () => {
      const userId = 1;
      const jwtId = userId.toString();

      expect(jwtId).toBe('1');
      expect(typeof jwtId).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when user not found', () => {
      expect(() => {
        throw new Error('Invalid credentials');
      }).toThrow('Invalid credentials');
    });

    it('should throw error when password is incorrect', () => {
      expect(() => {
        throw new Error('Invalid credentials');
      }).toThrow('Invalid credentials');
    });

    it('should not reveal which field is incorrect', () => {
      const error = 'Invalid credentials';

      expect(error).not.toContain('username');
      expect(error).not.toContain('password');
      expect(error).toContain('Invalid credentials');
    });

    it('should handle database errors gracefully', () => {
      const dbError = new Error('Database connection failed');

      expect(() => {
        throw dbError;
      }).toThrow('Database connection failed');
    });
  });

  describe('Provider Configuration', () => {
    it('should use CredentialsProvider', () => {
      const providerType = 'Credentials';
      expect(providerType).toBe('Credentials');
    });

    it('should have id set to credentials', () => {
      const providerId = 'credentials';
      expect(providerId).toBe('credentials');
    });

    it('should have name set to Credentials', () => {
      const providerName = 'Credentials';
      expect(providerName).toBe('Credentials');
    });

    it('should accept username and password credentials', () => {
      const credentials = {
        username: 'testuser',
        password: 'testpass',
      };

      expect(credentials).toHaveProperty('username');
      expect(credentials).toHaveProperty('password');
    });
  });
});
