import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { executeServerAction } from './server-action-utils'

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn(),
}))

import { requireAdmin } from '@/lib/auth/auth-utils'

const testSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
})

describe('executeServerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: '1', username: 'admin', isSuperadmin: true },
      expires: '2026-12-31',
    })
  })

  describe('Successful Execution', () => {
    it('should validate input, call handler, and return success', async () => {
      const handler = vi.fn().mockResolvedValue({ id: 42 })

      const result = await executeServerAction(
        { name: 'test', value: 5 },
        { validator: testSchema, handler }
      )

      expect(result).toEqual({ success: true, id: 42 })
      expect(handler).toHaveBeenCalledWith(
        { name: 'test', value: 5 },
        null
      )
    })

    it('should spread handler result into response', async () => {
      const handler = vi.fn().mockResolvedValue({
        teamId: 1,
        teamName: 'Sparta',
      })

      const result = await executeServerAction(
        { name: 'Sparta', value: 1 },
        { validator: testSchema, handler }
      )

      expect(result).toEqual({
        success: true,
        teamId: 1,
        teamName: 'Sparta',
      })
    })
  })

  describe('Validation', () => {
    it('should return error for invalid input', async () => {
      const handler = vi.fn()

      const result = await executeServerAction(
        { name: '', value: 'not a number' },
        { validator: testSchema, handler }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(handler).not.toHaveBeenCalled()
    })

    it('should return error for missing required fields', async () => {
      const handler = vi.fn()

      const result = await executeServerAction(
        {},
        { validator: testSchema, handler }
      )

      expect(result.success).toBe(false)
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Admin Authorization', () => {
    it('should call requireAdmin when requiresAdmin is true', async () => {
      const handler = vi.fn().mockResolvedValue({})

      await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler, requiresAdmin: true }
      )

      expect(requireAdmin).toHaveBeenCalledOnce()
    })

    it('should pass session to handler when requiresAdmin is true', async () => {
      const mockSession = {
        user: { id: '1', username: 'admin', isSuperadmin: true },
        expires: '2026-12-31',
      }
      vi.mocked(requireAdmin).mockResolvedValue(mockSession)
      const handler = vi.fn().mockResolvedValue({})

      await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler, requiresAdmin: true }
      )

      expect(handler).toHaveBeenCalledWith(
        { name: 'test', value: 1 },
        mockSession
      )
    })

    it('should not call requireAdmin when requiresAdmin is false', async () => {
      const handler = vi.fn().mockResolvedValue({})

      await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler, requiresAdmin: false }
      )

      expect(requireAdmin).not.toHaveBeenCalled()
    })

    it('should not call requireAdmin when requiresAdmin is omitted', async () => {
      const handler = vi.fn().mockResolvedValue({})

      await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler }
      )

      expect(requireAdmin).not.toHaveBeenCalled()
    })

    it('should return error when requireAdmin throws', async () => {
      vi.mocked(requireAdmin).mockRejectedValue(new Error('Unauthorized'))
      const handler = vi.fn()

      const result = await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler, requiresAdmin: true }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Revalidation', () => {
    it('should call revalidatePath when provided', async () => {
      const handler = vi.fn().mockResolvedValue({})

      await executeServerAction(
        { name: 'test', value: 1 },
        {
          validator: testSchema,
          handler,
          revalidatePath: '/admin/teams',
        }
      )

      expect(revalidatePath).toHaveBeenCalledWith('/admin/teams')
    })

    it('should not call revalidatePath when not provided', async () => {
      const handler = vi.fn().mockResolvedValue({})

      await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler }
      )

      expect(revalidatePath).not.toHaveBeenCalled()
    })

    it('should not revalidate when handler throws', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('DB error'))

      await executeServerAction(
        { name: 'test', value: 1 },
        {
          validator: testSchema,
          handler,
          revalidatePath: '/admin/teams',
        }
      )

      expect(revalidatePath).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should catch handler errors and return error response', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('DB connection lost'))

      const result = await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler }
      )

      expect(result).toEqual({
        success: false,
        error: 'DB connection lost',
      })
    })

    it('should use default message for non-Error throws', async () => {
      const handler = vi.fn().mockRejectedValue('string error')

      const result = await executeServerAction(
        { name: 'test', value: 1 },
        { validator: testSchema, handler }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Operation failed')
    })
  })

  describe('Execution Order', () => {
    it('should run auth → validation → handler → revalidate in order', async () => {
      const order: string[] = []

      vi.mocked(requireAdmin).mockImplementation(async () => {
        order.push('auth')
        return {
          user: { id: '1', username: 'admin', isSuperadmin: true },
          expires: '2026-12-31',
        }
      })

      const handler = vi.fn().mockImplementation(async () => {
        order.push('handler')
        return {}
      })

      vi.mocked(revalidatePath).mockImplementation(() => {
        order.push('revalidate')
      })

      await executeServerAction(
        { name: 'test', value: 1 },
        {
          validator: testSchema,
          handler,
          revalidatePath: '/admin',
          requiresAdmin: true,
        }
      )

      expect(order).toEqual(['auth', 'handler', 'revalidate'])
    })

    it('should validate before calling handler (reject invalid early)', async () => {
      const handler = vi.fn()

      await executeServerAction(
        { name: '' }, // Invalid — missing value, empty name
        {
          validator: testSchema,
          handler,
          requiresAdmin: true,
        }
      )

      // Auth runs before validation
      expect(requireAdmin).toHaveBeenCalled()
      // But handler should not run
      expect(handler).not.toHaveBeenCalled()
    })
  })
})
