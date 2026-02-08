import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const mockPrisma = vi.mocked(prisma, true)
const mockAuth = vi.mocked(auth)

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/push/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: '5' } } as any)
  })

  it('should soft-delete the subscription', async () => {
    mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 1 } as any)

    const response = await POST(makeRequest({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockPrisma.pushSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 5,
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          deletedAt: null,
        }),
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      })
    )
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const response = await POST(makeRequest({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    }))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 400 for invalid endpoint', async () => {
    const response = await POST(makeRequest({ endpoint: 'not-a-url' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid request data')
  })

  it('should return 400 when endpoint is missing', async () => {
    const response = await POST(makeRequest({}))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid request data')
  })

  it('should succeed even if no matching subscription exists', async () => {
    mockPrisma.pushSubscription.updateMany.mockResolvedValue({ count: 0 } as any)

    const response = await POST(makeRequest({
      endpoint: 'https://fcm.googleapis.com/fcm/send/nonexistent',
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
  })
})
