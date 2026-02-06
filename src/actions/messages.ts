'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getErrorMessage } from '@/lib/error-handler'
import {
  sendMessageSchema,
  getMessagesSchema,
  deleteMessageSchema,
  type SendMessageInput,
  type GetMessagesInput,
  type DeleteMessageInput,
} from '@/lib/validation/admin'
import { z } from 'zod'

const markChatAsReadSchema = z.object({
  leagueId: z.number().int().positive(),
})

/** Shared include for ReplyTo relation on messages */
const replyToInclude = {
  ReplyTo: {
    include: {
      LeagueUser: {
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      },
    },
  },
} as const

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
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = getMessagesSchema.parse(input)
    const userId = parseInt(session.user.id, 10)

    // Check league membership and chat enabled
    const leagueUser = await getLeagueUser(userId, validated.leagueId)
    if (!leagueUser) {
      return { success: false, error: 'You are not a member of this league or chat is disabled' }
    }

    // Fetch messages with cursor-based pagination
    const messages = await prisma.message.findMany({
      where: {
        leagueId: validated.leagueId,
        deletedAt: null,
        ...(validated.before && { createdAt: { lt: validated.before } }),
      },
      include: {
        LeagueUser: {
          include: {
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        ...replyToInclude,
      },
      orderBy: { createdAt: 'desc' },
      take: validated.limit,
    })

    // Reverse to show oldest first in UI
    return {
      success: true,
      messages: messages.reverse(),
      hasMore: messages.length === validated.limit,
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to fetch messages'),
    }
  }
}

/**
 * Send a message to a league chat.
 * Only accessible by active league members when chat is enabled and not suspended.
 */
export async function sendMessage(input: SendMessageInput) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = sendMessageSchema.parse(input)
    const userId = parseInt(session.user.id, 10)

    // Check league membership and chat enabled
    const leagueUser = await getLeagueUser(userId, validated.leagueId)
    if (!leagueUser) {
      return { success: false, error: 'You are not a member of this league or chat is disabled' }
    }

    // Check if chat is suspended
    const league = await prisma.league.findUnique({
      where: { id: validated.leagueId },
      select: { chatSuspendedAt: true },
    })

    if (league?.chatSuspendedAt) {
      return { success: false, error: 'Chat is temporarily suspended' }
    }

    // Validate replyToId if provided
    if (validated.replyToId) {
      const replyTarget = await prisma.message.findFirst({
        where: {
          id: validated.replyToId,
          leagueId: validated.leagueId,
          deletedAt: null,
        },
      })
      if (!replyTarget) {
        return { success: false, error: 'Reply target message not found' }
      }
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        leagueId: validated.leagueId,
        leagueUserId: leagueUser.id,
        text: validated.text,
        replyToId: validated.replyToId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        LeagueUser: {
          include: {
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        ...replyToInclude,
      },
    })

    revalidatePath(`/${validated.leagueId}/chat`)

    return {
      success: true,
      message,
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to send message'),
    }
  }
}

/**
 * Delete a message from the chat.
 * Users can delete their own messages.
 * League admins and superadmins can delete any message.
 */
export async function deleteMessage(input: DeleteMessageInput) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = deleteMessageSchema.parse(input)
    const userId = parseInt(session.user.id, 10)

    // Get the message with author info
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
      return { success: false, error: 'Message not found' }
    }

    if (!message.League.isChatEnabled) {
      return { success: false, error: 'Chat is disabled for this league' }
    }

    // Check if user can delete this message
    const isAuthor = message.LeagueUser.userId === userId
    const isSuperadmin = session.user.isSuperadmin

    // Check if user is league admin
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
      return { success: false, error: 'You can only delete your own messages' }
    }

    // Soft delete
    await prisma.message.update({
      where: { id: validated.id },
      data: { deletedAt: new Date() },
    })

    revalidatePath(`/${message.leagueId}/chat`)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to delete message'),
    }
  }
}

/**
 * Mark chat as read for the current user.
 * Updates the lastChatReadAt timestamp to now.
 */
export async function markChatAsRead(leagueId: number) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' }
    }

    const validated = markChatAsReadSchema.parse({ leagueId })
    const userId = parseInt(session.user.id, 10)

    // Update the lastChatReadAt timestamp for this league user
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

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to mark chat as read'),
    }
  }
}

