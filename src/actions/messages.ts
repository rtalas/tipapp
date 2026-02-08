'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { AppError } from '@/lib/error-handler'
import { parseSessionUserId } from '@/lib/auth/auth-utils'
import { AuditLogger } from '@/lib/logging/audit-logger'
import { executeServerAction } from '@/lib/server-action-utils'
import {
  sendMessageSchema,
  getMessagesSchema,
  deleteMessageSchema,
  type SendMessageInput,
  type GetMessagesInput,
  type DeleteMessageInput,
} from '@/lib/validation/admin'
import { z } from 'zod'
import { messageWithRelationsInclude } from '@/lib/prisma-helpers'

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
        select: { chatSuspendedAt: true },
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

      return {}
    },
  })
}
