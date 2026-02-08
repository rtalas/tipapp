import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

vi.mock('@/lib/push-notifications', () => ({
  getVapidPublicKey: vi.fn(),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockAuth = vi.mocked(auth)

const { getVapidPublicKey } = await import('@/lib/push-notifications')
const mockGetVapidPublicKey = vi.mocked(getVapidPublicKey)

const { POST, GET } = await import('./route')

const validSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8-l47z0',
    auth: 'tBHItJI5svbpC7',
  },
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: '5' } } as any)
  })

  it('should create a new subscription', async () => {
    mockPrisma.pushSubscription.findFirst.mockResolvedValue(null)
    mockPrisma.pushSubscription.create.mockResolvedValue({} as any)

    const response = await POST(makeRequest(validSubscription))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockPrisma.pushSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 5,
          endpoint: validSubscription.endpoint,
          p256dh: validSubscription.keys.p256dh,
          auth: validSubscription.keys.auth,
        }),
      })
    )
  })

  it('should update an existing subscription', async () => {
    mockPrisma.pushSubscription.findFirst.mockResolvedValue({ id: 42 } as any)
    mockPrisma.pushSubscription.update.mockResolvedValue({} as any)

    const response = await POST(makeRequest(validSubscription))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42 },
        data: expect.objectContaining({
          p256dh: validSubscription.keys.p256dh,
          auth: validSubscription.keys.auth,
        }),
      })
    )
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const response = await POST(makeRequest(validSubscription))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 400 for invalid subscription data', async () => {
    const response = await POST(makeRequest({ endpoint: 'not-a-url' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid subscription data')
  })

  it('should return 400 when keys are missing', async () => {
    const response = await POST(makeRequest({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe('Invalid subscription data')
  })
})

describe('GET /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: '5' } } as any)
  })

  it('should return VAPID public key', async () => {
    mockGetVapidPublicKey.mockReturnValue('test-vapid-key')

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.vapidPublicKey).toBe('test-vapid-key')
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 503 when VAPID not configured', async () => {
    mockGetVapidPublicKey.mockReturnValue(undefined)

    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.error).toContain('not configured')
  })
})
