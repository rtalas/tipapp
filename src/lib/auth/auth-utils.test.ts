import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin, parseSessionUserId } from './auth-utils'
import { auth } from '@/auth'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'

const mockAuth = vi.mocked(auth)
const mockAuditLogger = vi.mocked(AuditLogger)

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return session when user is superadmin', async () => {
    const session = {
      user: { id: '1', username: 'admin', isSuperadmin: true },
      expires: '2026-12-31',
    }
    mockAuth.mockResolvedValue(session as any)

    const result = await requireAdmin()

    expect(result).toBe(session)
    expect(mockAuditLogger.adminAccessDenied).not.toHaveBeenCalled()
  })

  it('should throw AppError when session is null', async () => {
    mockAuth.mockResolvedValue(null as any)

    await expect(requireAdmin()).rejects.toThrow(AppError)
    expect(mockAuditLogger.adminAccessDenied).toHaveBeenCalledWith(undefined)
  })

  it('should throw AppError when session is undefined', async () => {
    mockAuth.mockResolvedValue(undefined as any)

    await expect(requireAdmin()).rejects.toThrow(AppError)
  })

  it('should throw AppError when user is not superadmin', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '2', username: 'regular', isSuperadmin: false },
      expires: '2026-12-31',
    } as any)

    await expect(requireAdmin()).rejects.toThrow('Unauthorized: Admin access required')
    expect(mockAuditLogger.adminAccessDenied).toHaveBeenCalledWith(2)
  })

  it('should throw AppError when isSuperadmin is undefined', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '3', username: 'nofield' },
      expires: '2026-12-31',
    } as any)

    await expect(requireAdmin()).rejects.toThrow('Unauthorized: Admin access required')
  })

  it('should throw AppError when user object is missing', async () => {
    mockAuth.mockResolvedValue({ expires: '2026-12-31' } as any)

    await expect(requireAdmin()).rejects.toThrow('Unauthorized: Admin access required')
  })

  it('should throw with UNAUTHORIZED code and 403 status', async () => {
    mockAuth.mockResolvedValue(null as any)

    try {
      await requireAdmin()
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('UNAUTHORIZED')
      expect((error as AppError).statusCode).toBe(403)
    }
  })

  it('should call auth() exactly once', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', isSuperadmin: true },
    } as any)

    await requireAdmin()

    expect(mockAuth).toHaveBeenCalledTimes(1)
  })
})

describe('parseSessionUserId', () => {
  it('should parse valid numeric string', () => {
    expect(parseSessionUserId('42')).toBe(42)
  })

  it('should parse string with leading zeros', () => {
    expect(parseSessionUserId('007')).toBe(7)
  })

  it('should throw AppError for non-numeric string', () => {
    expect(() => parseSessionUserId('abc')).toThrow(AppError)
    expect(() => parseSessionUserId('abc')).toThrow('Invalid session user ID')
  })

  it('should throw AppError for empty string', () => {
    expect(() => parseSessionUserId('')).toThrow(AppError)
  })

  it('should throw with UNAUTHORIZED code and 401 status', () => {
    try {
      parseSessionUserId('not-a-number')
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('UNAUTHORIZED')
      expect((error as AppError).statusCode).toBe(401)
    }
  })
})
