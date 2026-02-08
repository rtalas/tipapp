import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import * as rateLimit from '@/lib/rate-limit'

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  checkLoginRateLimit: vi.fn().mockReturnValue({ limited: false, remaining: 10, retryAfterMs: 0 }),
  recordFailedLogin: vi.fn(),
}))

const mockHandlersPost = vi.fn()

vi.mock('@/auth', () => ({
  auth: vi.fn(),
  handlers: {
    GET: vi.fn(),
    POST: mockHandlersPost,
  },
}))

const mockCheckLoginRateLimit = vi.mocked(rateLimit.checkLoginRateLimit)
const mockRecordFailedLogin = vi.mocked(rateLimit.recordFailedLogin)

const { POST } = await import('./route')

function makeCredentialRequest(body?: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/auth/callback/credentials', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeOAuthRequest() {
  return new NextRequest('http://localhost/api/auth/callback/google', {
    method: 'POST',
  })
}

describe('POST /api/auth/[...nextauth]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckLoginRateLimit.mockReturnValue({ limited: false, remaining: 10, retryAfterMs: 0 })
    mockHandlersPost.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: '/dashboard' } })
    )
  })

  it('should pass through to Auth.js handler on successful login', async () => {
    const request = makeCredentialRequest({ username: 'testuser', password: 'Password1' })

    const response = await POST(request)

    expect(mockHandlersPost).toHaveBeenCalledWith(request)
    expect(response.status).toBe(302)
  })

  it('should return 429 when credential login is rate limited', async () => {
    mockCheckLoginRateLimit.mockReturnValue({ limited: true, remaining: 0, retryAfterMs: 60000 })

    const request = makeCredentialRequest({ username: 'testuser', password: 'Password1' })
    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(429)
    expect(json.error).toContain('Too many login attempts')
    expect(response.headers.get('Retry-After')).toBe('60')
    expect(mockHandlersPost).not.toHaveBeenCalled()
  })

  it('should not rate-limit non-credential auth routes', async () => {
    const request = makeOAuthRequest()

    await POST(request)

    expect(mockCheckLoginRateLimit).not.toHaveBeenCalled()
    expect(mockHandlersPost).toHaveBeenCalledWith(request)
  })

  it('should record failed login when response has error redirect', async () => {
    mockHandlersPost.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: '/login?error=CredentialsSignin' } })
    )

    await POST(makeCredentialRequest({ username: 'bad', password: 'wrong' }))

    expect(mockRecordFailedLogin).toHaveBeenCalledWith('127.0.0.1')
  })

  it('should not record failed login on successful credential auth', async () => {
    mockHandlersPost.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: '/dashboard' } })
    )

    await POST(makeCredentialRequest({ username: 'testuser', password: 'Password1' }))

    expect(mockRecordFailedLogin).not.toHaveBeenCalled()
  })

  it('should not record failed login for non-credential routes', async () => {
    mockHandlersPost.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: '/login?error=OAuthError' } })
    )

    await POST(makeOAuthRequest())

    expect(mockRecordFailedLogin).not.toHaveBeenCalled()
  })
})
