'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { AppError, isPrismaError } from '@/lib/error-handler'
import { parseSessionUserId } from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { executeServerAction } from '@/lib/server-action-utils'
import {
  sendMessageSchema,
  getMessagesSchema,
  deleteMessageSchema,
  toggleReactionSchema,
  type SendMessageInput,
  type GetMessagesInput,
  type DeleteMessageInput,
  type ToggleReactionInput,
} from '@/lib/validation/admin'
import { z } from 'zod'
import { messageWithRelationsInclude } from '@/lib/prisma-helpers'
import { sendChatNotifications, sendReactionNotification } from '@/lib/push-notifications'
import { getUserDisplayName } from '@/lib/user-display-utils'

const markChatAsReadSchema = z.object({
  leagueId: z.number().int().positive(),
})

/**
 * Get the current user's LeagueUser record for a specific league.
 * Returns null if user is not a member or not active.
 */
async function getLeagueUser(userId: number, leagueId: number) {
  return prisma.leagueUser.findFirst({
    where: {
      userId,
      leagueId,
      active: true,
      deletedAt: null,
      League: {
        deletedAt: null,
        isChatEnabled: true,
      },
    },
    include: {
      User: {
        select: {
          isSuperadmin: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  })
}

/**
 * Get messages for a league chat.
 * Only accessible by active league members when chat is enabled.
 */
export async function getMessages(input: GetMessagesInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: 'Authentication required' }
  }

  const userId = parseSessionUserId(session.user.id)

  return executeServerAction(input, {
    validator: getMessagesSchema,
    handler: async (validated) => {
      const leagueUser = await getLeagueUser(userId, validated.leagueId)
      if (!leagueUser) {
        throw new AppError('You are not a member of this league or chat is disabled', 'FORBIDDEN', 403)
      }

      const createdAtFilter: Record<string, Date> = {}
      if (validated.before) createdAtFilter.lt = validated.before
      if (validated.after) createdAtFilter.gt = validated.after

      const messages = await prisma.message.findMany({
        where: {
          leagueId: validated.leagueId,
          deletedAt: null,
          ...(Object.keys(createdAtFilter).length > 0 && { createdAt: createdAtFilter }),
        },
        include: {
          ...messageWithRelationsInclude,
        },
        orderBy: { createdAt: 'desc' },
        take: validated.limit,
      })

      return {
        messages: messages.reverse(),
        hasMore: messages.length === validated.limit,
      }
    },
  })
}

/**
 * Send a message to a league chat.
 * Only accessible by active league members when chat is enabled and not suspended.
 */
export async function sendMessage(input: SendMessageInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: 'Authentication required' }
  }

  const userId = parseSessionUserId(session.user.id)

  return executeServerAction(input, {
    validator: sendMessageSchema,
    handler: async (validated) => {
      const leagueUser = await getLeagueUser(userId, validated.leagueId)
      if (!leagueUser) {
        throw new AppError('You are not a member of this league or chat is disabled', 'FORBIDDEN', 403)
      }

      const league = await prisma.league.findUnique({
        where: { id: validated.leagueId, deletedAt: null },
        select: { name: true, chatSuspendedAt: true },
      })

      if (league?.chatSuspendedAt) {
        throw new AppError('Chat is temporarily suspended', 'FORBIDDEN', 403)
      }

      if (validated.replyToId) {
        const replyTarget = await prisma.message.findFirst({
          where: {
            id: validated.replyToId,
            leagueId: validated.leagueId,
            deletedAt: null,
          },
        })
        if (!replyTarget) {
          throw new AppError('Reply target message not found', 'NOT_FOUND', 404)
        }
      }

      const message = await prisma.message.create({
        data: {
          leagueId: validated.leagueId,
          leagueUserId: leagueUser.id,
          text: validated.text,
          replyToId: validated.replyToId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: messageWithRelationsInclude,
      })

      AuditLogger.chatMessageSent(userId, validated.leagueId, message.id).catch(() => {})

      // Fire-and-forget — don't block the response
      sendChatNotifications({
        leagueId: validated.leagueId,
        leagueName: league?.name || '',
        senderUserId: userId,
        senderName: `${leagueUser.User.firstName} ${leagueUser.User.lastName}`,
        messageText: validated.text,
      }).catch((err) => console.error('Chat notification error:', err))

      return { message }
    },
    revalidatePath: `/${(input as SendMessageInput).leagueId}/chat`,
  })
}

/**
 * Delete a message from the chat.
 * Users can delete their own messages.
 * League admins and superadmins can delete any message.
 */
export async function deleteMessage(input: DeleteMessageInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: 'Authentication required' }
  }

  const userId = parseSessionUserId(session.user.id)

  return executeServerAction(input, {
    validator: deleteMessageSchema,
    handler: async (validated) => {
      const message = await prisma.message.findUnique({
        where: { id: validated.id, deletedAt: null },
        include: {
          LeagueUser: {
            include: {
              User: true,
            },
          },
          League: {
            select: {
              id: true,
              isChatEnabled: true,
            },
          },
        },
      })

      if (!message) {
        throw new AppError('Message not found', 'NOT_FOUND', 404)
      }

      if (!message.League.isChatEnabled) {
        throw new AppError('Chat is disabled for this league', 'FORBIDDEN', 403)
      }

      const isAuthor = message.LeagueUser.userId === userId
      const isSuperadmin = session.user.isSuperadmin

      const userLeagueMembership = await prisma.leagueUser.findFirst({
        where: {
          userId,
          leagueId: message.leagueId,
          active: true,
          deletedAt: null,
        },
      })

      const isLeagueAdmin = userLeagueMembership?.admin === true

      if (!isAuthor && !isSuperadmin && !isLeagueAdmin) {
        throw new AppError('You can only delete your own messages', 'FORBIDDEN', 403)
      }

      await prisma.message.update({
        where: { id: validated.id },
        data: { deletedAt: new Date() },
      })

      AuditLogger.chatMessageDeleted(userId, message.leagueId, validated.id, isAuthor).catch(() => {})

      revalidatePath(`/${message.leagueId}/chat`)

      return {}
    },
  })
}

/**
 * Toggle an emoji reaction on a message.
 * Same emoji = remove, different emoji = change, no existing = add.
 * One reaction per user per message (WhatsApp-style).
 */
export async function toggleReaction(input: ToggleReactionInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: 'Authentication required' }
  }

  const userId = parseSessionUserId(session.user.id)

  return executeServerAction(input, {
    validator: toggleReactionSchema,
    handler: async (validated) => {
      const leagueUser = await getLeagueUser(userId, validated.leagueId)
      if (!leagueUser) {
        throw new AppError('You are not a member of this league or chat is disabled', 'FORBIDDEN', 403)
      }

      const message = await prisma.message.findFirst({
        where: { id: validated.messageId, leagueId: validated.leagueId, deletedAt: null },
        include: {
          LeagueUser: true,
          League: { select: { name: true } },
        },
      })
      if (!message) {
        throw new AppError('Message not found', 'NOT_FOUND', 404)
      }

      const existing = await prisma.messageReaction.findFirst({
        where: {
          messageId: validated.messageId,
          leagueUserId: leagueUser.id,
          deletedAt: null,
        },
      })

      let action: 'added' | 'removed' | 'changed'

      if (existing) {
        if (existing.emoji === validated.emoji) {
          // Same emoji: remove
          await prisma.messageReaction.update({
            where: { id: existing.id },
            data: { deletedAt: new Date() },
          })
          action = 'removed'
        } else {
          // Different emoji: change (soft delete old + create new)
          await prisma.$transaction([
            prisma.messageReaction.update({
              where: { id: existing.id },
              data: { deletedAt: new Date() },
            }),
            prisma.messageReaction.create({
              data: {
                messageId: validated.messageId,
                leagueUserId: leagueUser.id,
                emoji: validated.emoji,
                createdAt: new Date(),
              },
            }),
          ])
          action = 'changed'
        }
      } else {
        // No existing reaction: add
        // Catch P2002 (unique constraint) from concurrent double-taps — treat as no-op
        try {
          await prisma.messageReaction.create({
            data: {
              messageId: validated.messageId,
              leagueUserId: leagueUser.id,
              emoji: validated.emoji,
              createdAt: new Date(),
            },
          })
        } catch (err) {
          if (isPrismaError(err) && err.code === 'P2002') {
            return { action: 'added' as const }
          }
          throw err
        }
        action = 'added'
      }

      // Notify message author on add/change (not on remove, not on own message)
      if (action !== 'removed' && message.LeagueUser.userId !== userId) {
        const reactorName = getUserDisplayName(leagueUser.User)
        sendReactionNotification({
          leagueId: validated.leagueId,
          leagueName: message.League.name,
          messageAuthorUserId: message.LeagueUser.userId,
          reactorName,
          emoji: validated.emoji,
          messagePreview: message.text,
        }).catch((err) => console.error('Reaction notification error:', err))
      }

      return { action }
    },
  })
}

/**
 * Mark chat as read for the current user.
 * Updates the lastChatReadAt timestamp to now.
 */
export async function markChatAsRead(leagueId: number) {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false as const, error: 'Authentication required' }
  }

  const userId = parseSessionUserId(session.user.id)

  return executeServerAction({ leagueId }, {
    validator: markChatAsReadSchema,
    handler: async (validated) => {
      await prisma.leagueUser.updateMany({
        where: {
          userId,
          leagueId: validated.leagueId,
          active: true,
          deletedAt: null,
        },
        data: {
          lastChatReadAt: new Date(),
        },
      })

      // Revalidate layout so badge count updates on next navigation
      revalidatePath(`/${validated.leagueId}`, 'layout')

      return {}
    },
  })
}
