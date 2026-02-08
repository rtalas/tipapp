import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockProcessNotifications = vi.fn()

vi.mock('@/lib/push-notifications', () => ({
  processNotifications: mockProcessNotifications,
}))

const { GET, POST } = await import('./route')

const CRON_SECRET = 'test-cron-secret'

function makeRequest(method: string, authHeader?: string) {
  const headers: Record<string, string> = {}
  if (authHeader) headers.authorization = authHeader
  return new NextRequest('http://localhost/api/cron/notifications', { method, headers })
}

describe('Cron notifications route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })

  for (const [name, handler] of [['GET', GET], ['POST', POST]] as const) {
    describe(name, () => {
      it('should process notifications with valid auth', async () => {
        mockProcessNotifications.mockResolvedValue({ processed: 5, sent: 3, failed: 0 })

        const response = await handler(makeRequest(name, `Bearer ${CRON_SECRET}`))
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.success).toBe(true)
        expect(json.processed).toBe(5)
        expect(json.sent).toBe(3)
        expect(json.failed).toBe(0)
      })

      it('should return 401 with invalid auth', async () => {
        const response = await handler(makeRequest(name, 'Bearer wrong-secret'))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Unauthorized')
      })

      it('should return 401 with no auth header', async () => {
        const response = await handler(makeRequest(name))
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json.error).toBe('Unauthorized')
      })

      it('should return 503 when CRON_SECRET not configured', async () => {
        vi.stubEnv('CRON_SECRET', '')

        const response = await handler(makeRequest(name, `Bearer ${CRON_SECRET}`))
        const json = await response.json()

        expect(response.status).toBe(503)
        expect(json.error).toBe('Cron not configured')
      })

      it('should return 500 when processNotifications throws', async () => {
        mockProcessNotifications.mockRejectedValue(new Error('DB connection failed'))

        const response = await handler(makeRequest(name, `Bearer ${CRON_SECRET}`))
        const json = await response.json()

        expect(response.status).toBe(500)
        expect(json.error).toBe('Failed to process notifications')
      })
    })
  }
})
