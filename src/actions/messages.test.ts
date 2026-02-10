import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMessages, sendMessage, deleteMessage, markChatAsRead, toggleReaction } from './messages'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const mockSendChatNotifications = vi.fn().mockResolvedValue(undefined)
const mockSendReactionNotification = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/push-notifications', () => ({
  sendChatNotifications: (...args: unknown[]) => mockSendChatNotifications(...args),
  sendReactionNotification: (...args: unknown[]) => mockSendReactionNotification(...args),
}))

vi.mock('@/lib/auth/auth-utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: '1', isSuperadmin: true } }),
  parseSessionUserId: vi.fn((id: string) => parseInt(id, 10)),
}))

const mockPrisma = vi.mocked(prisma, true)
const mockAuth = vi.mocked(auth)

const mockSession = { user: { id: '5', isSuperadmin: false } }

describe('Messages Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(mockSession as any)
  })

  describe('getMessages', () => {
    it('should return messages for league member', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10 } as any)
      mockPrisma.message.findMany.mockResolvedValue([
        { id: 1, text: 'Hello' },
        { id: 2, text: 'World' },
      ] as any)

      const result = await getMessages({ leagueId: 1, limit: 50 })

      expect(result.success).toBe(true)
      expect((result as any).messages).toHaveLength(2)
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await getMessages({ leagueId: 1, limit: 50 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Authentication required')
    })

    it('should return error when not league member', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue(null) // not a member

      const result = await getMessages({ leagueId: 1, limit: 50 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('not a member')
    })
  })

  describe('sendMessage', () => {
    it('should send message and trigger chat notifications', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({
        id: 10, userId: 5, User: { isSuperadmin: false, firstName: 'John', lastName: 'Doe' },
      } as any)
      mockPrisma.league.findUnique.mockResolvedValue({ name: 'Test League', chatSuspendedAt: null } as any)
      mockPrisma.message.create.mockResolvedValue({ id: 1, text: 'Hello' } as any)

      const result = await sendMessage({ leagueId: 1, text: 'Hello' })

      expect(result.success).toBe(true)
      expect((result as any).message).toBeDefined()
      expect(mockSendChatNotifications).toHaveBeenCalledWith({
        leagueId: 1,
        leagueName: 'Test League',
        senderUserId: 5,
        senderName: 'John Doe',
        messageText: 'Hello',
      })
    })

    it('should return error when chat suspended', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10 } as any)
      mockPrisma.league.findUnique.mockResolvedValue({ chatSuspendedAt: new Date() } as any)

      const result = await sendMessage({ leagueId: 1, text: 'Hello' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('suspended')
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await sendMessage({ leagueId: 1, text: 'Hello' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Authentication required')
    })

    it('should validate reply target exists', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10 } as any)
      mockPrisma.league.findUnique.mockResolvedValue({ chatSuspendedAt: null } as any)
      mockPrisma.message.findFirst.mockResolvedValue(null) // reply target not found

      const result = await sendMessage({ leagueId: 1, text: 'Reply', replyToId: 999 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Reply target')
    })

    it('should reject reply to a deleted message', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10 } as any)
      mockPrisma.league.findUnique.mockResolvedValue({ chatSuspendedAt: null } as any)
      // findFirst with deletedAt: null filter excludes deleted messages
      mockPrisma.message.findFirst.mockResolvedValue(null)

      const result = await sendMessage({ leagueId: 1, text: 'Reply to deleted', replyToId: 42 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Reply target')
    })

    it('should trim message text', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({
        id: 10, userId: 5, User: { isSuperadmin: false, firstName: 'John', lastName: 'Doe' },
      } as any)
      mockPrisma.league.findUnique.mockResolvedValue({ name: 'Test', chatSuspendedAt: null } as any)
      mockPrisma.message.create.mockResolvedValue({ id: 1, text: 'Hello' } as any)

      await sendMessage({ leagueId: 1, text: '  Hello  ' })

      expect(mockPrisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ text: 'Hello' }),
        })
      )
    })
  })

  describe('deleteMessage', () => {
    it('should delete own message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        LeagueUser: { userId: 5, User: { isSuperadmin: false } },
        League: { id: 1, isChatEnabled: true },
      } as any)
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ admin: false } as any)
      mockPrisma.message.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteMessage({ id: 1 })

      expect(result.success).toBe(true)
    })

    it('should allow superadmin to delete any message', async () => {
      mockAuth.mockResolvedValue({ user: { id: '5', isSuperadmin: true } } as any)
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        LeagueUser: { userId: 99, User: { isSuperadmin: false } }, // different user
        League: { id: 1, isChatEnabled: true },
      } as any)
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ admin: false } as any)
      mockPrisma.message.update.mockResolvedValue({ id: 1 } as any)

      const result = await deleteMessage({ id: 1 })

      expect(result.success).toBe(true)
    })

    it('should reject non-author non-admin delete', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        LeagueUser: { userId: 99, User: { isSuperadmin: false } }, // different user
        League: { id: 1, isChatEnabled: true },
      } as any)
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ admin: false } as any)

      const result = await deleteMessage({ id: 1 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('only delete your own')
    })

    it('should return error when message not found', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null)

      const result = await deleteMessage({ id: 999 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Message not found')
    })

    it('should reject when chat is disabled', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: 1,
        leagueId: 1,
        LeagueUser: { userId: 5, User: {} },
        League: { id: 1, isChatEnabled: false },
      } as any)

      const result = await deleteMessage({ id: 1 })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Chat is disabled')
    })
  })

  describe('markChatAsRead', () => {
    it('should update lastChatReadAt', async () => {
      mockPrisma.leagueUser.updateMany.mockResolvedValue({ count: 1 } as any)

      const result = await markChatAsRead(1)

      expect(result.success).toBe(true)
      expect(mockPrisma.leagueUser.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 5, leagueId: 1 }),
          data: expect.objectContaining({ lastChatReadAt: expect.any(Date) }),
        })
      )
    })

    it('should return error when not authenticated', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await markChatAsRead(1)

      expect(result.success).toBe(false)
    })
  })

  describe('toggleReaction', () => {
    it('should add reaction for league member', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10, userId: 5, User: { firstName: 'John', lastName: 'Doe' } } as any)
      mockPrisma.message.findFirst.mockResolvedValue({ id: 1, leagueId: 1, text: 'Hello', LeagueUser: { userId: 99 }, League: { name: 'Test' } } as any)
      mockPrisma.messageReaction.findFirst.mockResolvedValue(null)
      mockPrisma.messageReaction.create.mockResolvedValue({ id: 1, emoji: '👍' } as any)

      const result = await toggleReaction({ leagueId: 1, messageId: 1, emoji: '👍' })

      expect(result.success).toBe(true)
      expect((result as any).action).toBe('added')
      expect(mockPrisma.messageReaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ messageId: 1, leagueUserId: 10, emoji: '👍' }),
        })
      )
    })

    it('should remove reaction when same emoji tapped again', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10 } as any)
      mockPrisma.message.findFirst.mockResolvedValue({ id: 1, leagueId: 1 } as any)
      mockPrisma.messageReaction.findFirst.mockResolvedValue({ id: 5, emoji: '👍' } as any)
      mockPrisma.messageReaction.update.mockResolvedValue({ id: 5 } as any)

      const result = await toggleReaction({ leagueId: 1, messageId: 1, emoji: '👍' })

      expect(result.success).toBe(true)
      expect((result as any).action).toBe('removed')
      expect(mockPrisma.messageReaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('should change reaction when different emoji tapped', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10, userId: 5, User: { firstName: 'John', lastName: 'Doe' } } as any)
      mockPrisma.message.findFirst.mockResolvedValue({ id: 1, leagueId: 1, text: 'Hello', LeagueUser: { userId: 99 }, League: { name: 'Test' } } as any)
      mockPrisma.messageReaction.findFirst.mockResolvedValue({ id: 5, emoji: '👍' } as any)
      mockPrisma.$transaction.mockResolvedValue([{}, {}] as any)

      const result = await toggleReaction({ leagueId: 1, messageId: 1, emoji: '❤️' })

      expect(result.success).toBe(true)
      expect((result as any).action).toBe('changed')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should reject unauthenticated user', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await toggleReaction({ leagueId: 1, messageId: 1, emoji: '👍' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Authentication required')
    })

    it('should reject non-league member', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue(null)

      const result = await toggleReaction({ leagueId: 1, messageId: 1, emoji: '👍' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('not a member')
    })

    it('should reject reaction on non-existent message', async () => {
      mockPrisma.leagueUser.findFirst.mockResolvedValue({ id: 10 } as any)
      mockPrisma.message.findFirst.mockResolvedValue(null)

      const result = await toggleReaction({ leagueId: 1, messageId: 999, emoji: '👍' })

      expect(result.success).toBe(false)
      expect((result as any).error).toContain('Message not found')
    })
  })
})
