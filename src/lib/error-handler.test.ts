import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ZodError, z } from 'zod'
import {
  AppError,
  handleActionError,
  getErrorMessage,
  handlePrismaError,
  isPrismaError,
  logError,
  type PrismaError,
  type ErrorResponse,
} from './error-handler'

describe('error-handler', () => {
  describe('isPrismaError', () => {
    it('should return true for valid Prisma error', () => {
      const error: PrismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      }
      expect(isPrismaError(error)).toBe(true)
    })

    it('should return false for non-Prisma error', () => {
      expect(isPrismaError(new Error('test'))).toBe(false)
      expect(isPrismaError(null)).toBe(false)
      expect(isPrismaError(undefined)).toBe(false)
      expect(isPrismaError('string')).toBe(false)
      expect(isPrismaError(123)).toBe(false)
    })

    it('should return false for object without code property', () => {
      expect(isPrismaError({ message: 'test' })).toBe(false)
    })

    it('should return false for object with non-string code', () => {
      expect(isPrismaError({ code: 123 })).toBe(false)
    })
  })

  describe('AppError', () => {
    it('should create AppError with message only', () => {
      const error = new AppError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('UNKNOWN_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('AppError')
    })

    it('should create AppError with custom code', () => {
      const error = new AppError('Test error', 'CUSTOM_CODE')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('CUSTOM_CODE')
      expect(error.statusCode).toBe(400)
    })

    it('should create AppError with custom status code', () => {
      const error = new AppError('Test error', 'CUSTOM_CODE', 404)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('CUSTOM_CODE')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('handleActionError', () => {
    it('should handle ZodError with field errors', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      })

      try {
        schema.parse({ email: 'invalid', age: 10 })
      } catch (error) {
        const result = handleActionError(error)
        expect(result.message).toBe('Validation failed')
        expect(result.code).toBe('VALIDATION_ERROR')
        expect(result.fieldErrors).toBeDefined()
        expect(result.fieldErrors?.email).toBeDefined()
        expect(result.fieldErrors?.email?.[0]).toContain('email')
        expect(result.fieldErrors?.age).toBeDefined()
        expect(result.fieldErrors?.age?.[0]).toContain('18')
      }
    })

    it('should handle ZodError with nested field errors', () => {
      const schema = z.object({
        user: z.object({
          name: z.string().min(3),
        }),
      })

      try {
        schema.parse({ user: { name: 'ab' } })
      } catch (error) {
        const result = handleActionError(error)
        expect(result.fieldErrors?.['user.name']).toBeDefined()
      }
    })

    it('should handle AppError', () => {
      const error = new AppError('Custom error', 'CUSTOM_CODE', 403)
      const result = handleActionError(error)

      expect(result.message).toBe('Custom error')
      expect(result.code).toBe('CUSTOM_CODE')
      expect(result.fieldErrors).toBeUndefined()
    })

    it('should handle standard Error', () => {
      const error = new Error('Standard error message')
      const result = handleActionError(error)

      expect(result.message).toBe('Standard error message')
      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.fieldErrors).toBeUndefined()
    })

    it('should handle unknown error types with default message', () => {
      const result = handleActionError('string error', 'Default message')

      expect(result.message).toBe('Default message')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle null error', () => {
      const result = handleActionError(null, 'Null error')

      expect(result.message).toBe('Null error')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle undefined error', () => {
      const result = handleActionError(undefined, 'Undefined error')

      expect(result.message).toBe('Undefined error')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should use default message when not provided', () => {
      const result = handleActionError('unknown')

      expect(result.message).toBe('An unexpected error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })
  })

  describe('getErrorMessage', () => {
    it('should extract message from ZodError', () => {
      const schema = z.string().email()
      try {
        schema.parse('invalid')
      } catch (error) {
        const message = getErrorMessage(error)
        expect(message).toBe('Validation failed')
      }
    })

    it('should extract message from AppError', () => {
      const error = new AppError('Custom error message')
      const message = getErrorMessage(error)
      expect(message).toBe('Custom error message')
    })

    it('should extract message from standard Error', () => {
      const error = new Error('Standard error')
      const message = getErrorMessage(error)
      expect(message).toBe('Standard error')
    })

    it('should return default message for unknown error', () => {
      const message = getErrorMessage('unknown', 'Fallback message')
      expect(message).toBe('Fallback message')
    })

    it('should use default "An error occurred" when no default provided', () => {
      const message = getErrorMessage('unknown')
      expect(message).toBe('An error occurred')
    })
  })

  describe('handlePrismaError', () => {
    it('should handle P2002 (unique constraint) with target field', () => {
      const error: PrismaError = {
        code: 'P2002',
        meta: { target: ['email'] },
      }

      const result = handlePrismaError(error)

      expect(result.message).toBe('"email" already exists')
      expect(result.code).toBe('UNIQUE_CONSTRAINT_VIOLATED')
    })

    it('should handle P2002 without target field', () => {
      const error: PrismaError = {
        code: 'P2002',
        meta: {},
      }

      const result = handlePrismaError(error)

      expect(result.message).toBe('This field already exists')
      expect(result.code).toBe('UNIQUE_CONSTRAINT_VIOLATED')
    })

    it('should handle P2002 with no meta', () => {
      const error: PrismaError = {
        code: 'P2002',
      }

      const result = handlePrismaError(error)

      expect(result.message).toBe('This field already exists')
      expect(result.code).toBe('UNIQUE_CONSTRAINT_VIOLATED')
    })

    it('should handle P2025 (record not found)', () => {
      const error: PrismaError = {
        code: 'P2025',
      }

      const result = handlePrismaError(error)

      expect(result.message).toBe('Record not found')
      expect(result.code).toBe('RECORD_NOT_FOUND')
    })

    it('should handle P2003 (foreign key constraint)', () => {
      const error: PrismaError = {
        code: 'P2003',
      }

      const result = handlePrismaError(error)

      expect(result.message).toBe('Referenced record not found')
      expect(result.code).toBe('FOREIGN_KEY_CONSTRAINT_FAILED')
    })

    it('should handle unknown Prisma error codes', () => {
      const error: PrismaError = {
        code: 'P9999',
      }

      const result = handlePrismaError(error)

      expect(result.message).toBe('Database error: P9999')
      expect(result.code).toBe('P9999')
    })

    it('should handle multiple target fields in P2002', () => {
      const error: PrismaError = {
        code: 'P2002',
        meta: { target: ['email', 'username'] },
      }

      const result = handlePrismaError(error)

      // Takes first field
      expect(result.message).toBe('"email" already exists')
      expect(result.code).toBe('UNIQUE_CONSTRAINT_VIOLATED')
    })
  })

  describe('logError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })

    it('should log error in development mode', () => {
      process.env.NODE_ENV = 'development'
      const error = new Error('Test error')
      const context = { userId: 123 }

      logError(error, context)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR]',
        expect.objectContaining({
          error,
          context,
          environment: 'development',
        })
      )
    })

    it('should log error in production mode', () => {
      process.env.NODE_ENV = 'production'
      const error = new Error('Prod error')

      logError(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[PROD_ERROR]',
        expect.objectContaining({
          error,
          context: undefined,
          environment: 'production',
        })
      )
    })

    it('should include timestamp in log', () => {
      const error = new Error('Test')
      logError(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      )
    })

    it('should handle errors without context', () => {
      const error = new Error('No context')
      logError(error)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          error,
          context: undefined,
        })
      )
    })

    it('should log non-Error objects', () => {
      const errorObject = { message: 'Custom error', code: 500 }
      logError(errorObject)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          error: errorObject,
        })
      )
    })
  })

  describe('integration scenarios', () => {
    it('should handle ZodError -> getErrorMessage workflow', () => {
      const schema = z.object({
        username: z.string().min(3),
        password: z.string().min(8),
      })

      try {
        schema.parse({ username: 'ab', password: '123' })
      } catch (error) {
        const message = getErrorMessage(error, 'Validation error')
        expect(message).toBe('Validation failed')

        const errorResponse = handleActionError(error)
        expect(errorResponse.fieldErrors?.username).toBeDefined()
        expect(errorResponse.fieldErrors?.password).toBeDefined()
      }
    })

    it('should handle Prisma error detection -> handlePrismaError workflow', () => {
      const error: PrismaError = {
        code: 'P2002',
        meta: { target: ['username'] },
      }

      if (isPrismaError(error)) {
        const result = handlePrismaError(error)
        expect(result.message).toBe('"username" already exists')
        expect(result.code).toBe('UNIQUE_CONSTRAINT_VIOLATED')
      }
    })

    it('should handle chained error handling', () => {
      const errors: unknown[] = [
        new ZodError([]),
        new AppError('App error', 'APP_ERROR'),
        new Error('Standard error'),
        'string error',
        null,
      ]

      errors.forEach((error) => {
        const message = getErrorMessage(error, 'Default')
        expect(typeof message).toBe('string')
        expect(message.length).toBeGreaterThan(0)
      })
    })
  })
})
