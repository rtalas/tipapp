import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { auth } from '@/auth'

const mockAuth = vi.mocked(auth)

const mockCreateSignedUploadUrl = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockFrom = vi.fn().mockReturnValue({
  createSignedUploadUrl: mockCreateSignedUploadUrl,
  getPublicUrl: mockGetPublicUrl,
})

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    storage: { from: (...args: unknown[]) => mockFrom(...args) },
  }),
}))

vi.mock('@/lib/supabase', () => ({
  AVATAR_BUCKET: 'Avatars',
}))

const { POST } = await import('./route')

function makeRequest(body?: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/avatar/upload-url', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/avatar/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: '5' } } as any)
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed', token: 'tok_123' },
      error: null,
    })
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/public/5.jpg' },
    })
  })

  it('should return signed upload URL for authenticated user', async () => {
    const response = await POST(makeRequest({ contentType: 'image/jpeg' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.signedUrl).toBe('https://storage.example.com/signed')
    expect(json.token).toBe('tok_123')
    expect(json.publicUrl).toBe('https://storage.example.com/public/5.jpg')
    expect(json.contentType).toBe('image/jpeg')
  })

  it('should default to image/jpeg when no body', async () => {
    const request = new NextRequest('http://localhost/api/avatar/upload-url', {
      method: 'POST',
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.contentType).toBe('image/jpeg')
  })

  it('should use .jpg extension for jpeg', async () => {
    await POST(makeRequest({ contentType: 'image/jpeg' }))

    expect(mockFrom).toHaveBeenCalledWith('Avatars')
    expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith('5.jpg', { upsert: true })
  })

  it('should use .png extension for png', async () => {
    await POST(makeRequest({ contentType: 'image/png' }))

    expect(mockCreateSignedUploadUrl).toHaveBeenCalledWith('5.png', { upsert: true })
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const response = await POST(makeRequest({ contentType: 'image/jpeg' }))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 400 for disallowed content type', async () => {
    const response = await POST(makeRequest({ contentType: 'image/svg+xml' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain('Invalid file type')
  })

  it('should return 500 when supabase returns error', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'Bucket not found' },
    })

    const response = await POST(makeRequest({ contentType: 'image/jpeg' }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to create upload URL')
  })
})
