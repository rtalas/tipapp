import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from './auth-utils'
import { auth } from '@/auth'
import { AppError } from '@/lib/error-handler'

const mockAuth = vi.mocked(auth)

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
  })

  it('should throw AppError when session is null', async () => {
    mockAuth.mockResolvedValue(null as any)

    await expect(requireAdmin()).rejects.toThrow(AppError)
    await expect(requireAdmin()).rejects.toThrow('Unauthorized: Admin access required')
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
