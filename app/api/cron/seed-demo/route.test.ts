import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSeedDemo = vi.fn()
const mockDisconnect = vi.fn()

vi.mock('../../../../prisma/seed-demo', () => ({
  seedDemo: mockSeedDemo,
  prisma: { $disconnect: mockDisconnect },
}))

const { POST } = await import('./route')

const CRON_SECRET = 'test-cron-secret'

function makeRequest(authHeader?: string) {
  const headers: Record<string, string> = {}
  if (authHeader) headers.authorization = authHeader
  return new NextRequest('http://localhost/api/cron/seed-demo', { method: 'POST', headers })
}

describe('POST /api/cron/seed-demo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })

  it('should seed demo database with valid auth', async () => {
    mockSeedDemo.mockResolvedValue(undefined)

    const response = await POST(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockSeedDemo).toHaveBeenCalled()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should return 401 with invalid auth', async () => {
    const response = await POST(makeRequest('Bearer wrong-secret'))
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
    expect(mockSeedDemo).not.toHaveBeenCalled()
  })

  it('should return 401 with no auth header', async () => {
    const response = await POST(makeRequest())
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('should return 503 when CRON_SECRET not configured', async () => {
    vi.stubEnv('CRON_SECRET', '')

    const response = await POST(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.error).toBe('Cron not configured')
  })

  it('should return 500 when seedDemo throws', async () => {
    mockSeedDemo.mockRejectedValue(new Error('Seed failed'))

    const response = await POST(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe('Failed to seed demo database')
  })

  it('should disconnect prisma even on failure', async () => {
    mockSeedDemo.mockRejectedValue(new Error('Seed failed'))

    await POST(makeRequest(`Bearer ${CRON_SECRET}`))

    expect(mockDisconnect).toHaveBeenCalled()
  })
})
