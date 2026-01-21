import { describe, it, expect } from 'vitest'
import {
  sendMessageSchema,
  getMessagesSchema,
  deleteMessageSchema,
  updateLeagueChatSettingsSchema,
} from '@/lib/validation/admin'

describe('Message Validation Schemas', () => {
  describe('sendMessageSchema', () => {
    it('should accept valid message data', () => {
      const result = sendMessageSchema.safeParse({
        leagueId: 1,
        text: 'Hello, world!',
      })

      expect(result.success).toBe(true)
    })

    it('should accept message with max length (1000 chars)', () => {
      const result = sendMessageSchema.safeParse({
        leagueId: 1,
        text: 'a'.repeat(1000),
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty message', () => {
      const result = sendMessageSchema.safeParse({
        leagueId: 1,
        text: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('text')
      }
    })

    it('should reject message exceeding max length', () => {
      const result = sendMessageSchema.safeParse({
        leagueId: 1,
        text: 'a'.repeat(1001),
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path[0]).toBe('text')
      }
    })

    it('should reject missing leagueId', () => {
      const result = sendMessageSchema.safeParse({
        text: 'Hello!',
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid leagueId', () => {
      const result = sendMessageSchema.safeParse({
        leagueId: 0,
        text: 'Hello!',
      })

      expect(result.success).toBe(false)
    })

    it('should reject negative leagueId', () => {
      const result = sendMessageSchema.safeParse({
        leagueId: -1,
        text: 'Hello!',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('getMessagesSchema', () => {
    it('should accept valid request with leagueId only', () => {
      const result = getMessagesSchema.safeParse({
        leagueId: 1,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50) // default value
      }
    })

    it('should accept custom limit', () => {
      const result = getMessagesSchema.safeParse({
        leagueId: 1,
        limit: 25,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
      }
    })

    it('should accept before cursor', () => {
      const beforeDate = new Date('2024-01-01')
      const result = getMessagesSchema.safeParse({
        leagueId: 1,
        before: beforeDate,
      })

      expect(result.success).toBe(true)
    })

    it('should reject limit less than 1', () => {
      const result = getMessagesSchema.safeParse({
        leagueId: 1,
        limit: 0,
      })

      expect(result.success).toBe(false)
    })

    it('should reject limit greater than 100', () => {
      const result = getMessagesSchema.safeParse({
        leagueId: 1,
        limit: 101,
      })

      expect(result.success).toBe(false)
    })

    it('should accept limit of 100 (max)', () => {
      const result = getMessagesSchema.safeParse({
        leagueId: 1,
        limit: 100,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('deleteMessageSchema', () => {
    it('should accept valid message id', () => {
      const result = deleteMessageSchema.safeParse({
        id: 42,
      })

      expect(result.success).toBe(true)
    })

    it('should reject zero id', () => {
      const result = deleteMessageSchema.safeParse({
        id: 0,
      })

      expect(result.success).toBe(false)
    })

    it('should reject negative id', () => {
      const result = deleteMessageSchema.safeParse({
        id: -1,
      })

      expect(result.success).toBe(false)
    })

    it('should reject missing id', () => {
      const result = deleteMessageSchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })

  describe('updateLeagueChatSettingsSchema', () => {
    it('should accept enabling chat', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        leagueId: 1,
        isChatEnabled: true,
      })

      expect(result.success).toBe(true)
    })

    it('should accept disabling chat', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        leagueId: 1,
        isChatEnabled: false,
      })

      expect(result.success).toBe(true)
    })

    it('should accept suspending chat', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        leagueId: 1,
        suspend: true,
      })

      expect(result.success).toBe(true)
    })

    it('should accept resuming chat', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        leagueId: 1,
        suspend: false,
      })

      expect(result.success).toBe(true)
    })

    it('should accept both isChatEnabled and suspend', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        leagueId: 1,
        isChatEnabled: true,
        suspend: false,
      })

      expect(result.success).toBe(true)
    })

    it('should reject missing leagueId', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        isChatEnabled: true,
      })

      expect(result.success).toBe(false)
    })

    it('should reject invalid leagueId', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        leagueId: 0,
        isChatEnabled: true,
      })

      expect(result.success).toBe(false)
    })

    it('should accept leagueId only (no changes specified)', () => {
      const result = updateLeagueChatSettingsSchema.safeParse({
        leagueId: 1,
      })

      expect(result.success).toBe(true)
    })
  })
})
