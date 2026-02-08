import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as rateLimit from '@/lib/rate-limit'

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  checkRegistrationRateLimit: vi.fn().mockReturnValue({ limited: false, remaining: 5, retryAfterMs: 0 }),
}))

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}))

vi.mock('@/lib/logging/audit-logger', () => ({
  AuditLogger: {
    userRegistered: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/email/email', () => ({
  sendRegistrationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockCheckRegistrationRateLimit = vi.mocked(rateLimit.checkRegistrationRateLimit)

const { POST } = await import('./route')

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = {
  firstName: 'John',
  lastName: 'Doe',
  username: 'johndoe',
  email: 'john@example.com',
  password: 'Password1',
  confirmPassword: 'Password1',
}

function makeP2002Error(field: string) {
  const error = new Error('Unique constraint failed') as any
  error.code = 'P2002'
  error.meta = { target: [field] }
  return error
}

describe('POST /api/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRegistrationRateLimit.mockReturnValue({ limited: false, remaining: 5, retryAfterMs: 0 })
  })

  it('should register a new user successfully', async () => {
    mockPrisma.user.create.mockResolvedValue({
      id: 1,
      username: 'johndoe',
      email: 'john@example.com',
      firstName: 'John',
    } as any)

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.user.username).toBe('johndoe')
    expect(json.user.email).toBe('john@example.com')
  })

  it('should store email in lowercase', async () => {
    mockPrisma.user.create.mockResolvedValue({
      id: 1,
      username: 'johndoe',
      email: 'john@example.com',
      firstName: 'John',
    } as any)

    await POST(makeRequest({ ...validBody, email: 'John@Example.COM' }))

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'john@example.com',
        }),
      })
    )
  })

  it('should hash password with salt 12', async () => {
    const { hash } = await import('bcryptjs')
    mockPrisma.user.create.mockResolvedValue({ id: 1, username: 'johndoe', email: 'john@example.com', firstName: 'John' } as any)

    await POST(makeRequest(validBody))

    expect(hash).toHaveBeenCalledWith('Password1', 12)
  })

  it('should return 400 when username already taken', async () => {
    mockPrisma.user.create.mockRejectedValue(makeP2002Error('username'))

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Username already taken')
  })

  it('should return 400 when email already registered', async () => {
    mockPrisma.user.create.mockRejectedValue(makeP2002Error('email'))

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Email already registered')
  })

  it('should return 429 when rate limited', async () => {
    mockCheckRegistrationRateLimit.mockReturnValue({ limited: true, remaining: 0, retryAfterMs: 30000 })

    const response = await POST(makeRequest(validBody))
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.error).toContain('Too many registration attempts')
    expect(response.headers.get('Retry-After')).toBe('30')
  })

  it('should reject weak password (no uppercase)', async () => {
    const response = await POST(makeRequest({
      ...validBody,
      password: 'password1',
      confirmPassword: 'password1',
    }))

    expect(response.status).toBe(500)
  })

  it('should reject mismatched passwords', async () => {
    const response = await POST(makeRequest({
      ...validBody,
      confirmPassword: 'DifferentPassword1',
    }))

    expect(response.status).toBe(500)
  })

  it('should reject short username', async () => {
    const response = await POST(makeRequest({
      ...validBody,
      username: 'ab',
    }))

    expect(response.status).toBe(500)
  })

  it('should reject invalid email', async () => {
    const response = await POST(makeRequest({
      ...validBody,
      email: 'not-an-email',
    }))

    expect(response.status).toBe(500)
  })

  it('should reject missing required fields', async () => {
    const response = await POST(makeRequest({
      username: 'johndoe',
    }))

    expect(response.status).toBe(500)
  })

  it('should set isSuperadmin to false for new users', async () => {
    mockPrisma.user.create.mockResolvedValue({ id: 1, username: 'johndoe', email: 'john@example.com', firstName: 'John' } as any)

    await POST(makeRequest(validBody))

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isSuperadmin: false,
        }),
      })
    )
  })
})
