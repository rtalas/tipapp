import type { MessageWithRelations } from '@/lib/prisma-helpers'

export interface GroupedReaction {
  emoji: string
  count: number
  hasReacted: boolean
  users: Array<{ id: number; firstName: string | null; lastName: string | null; username: string }>
}

export function groupReactions(
  reactions: MessageWithRelations['MessageReaction'],
  currentUserId: number
): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>()

  for (const reaction of reactions) {
    const user = reaction.LeagueUser.User
    const existing = map.get(reaction.emoji)

    if (existing) {
      existing.count++
      existing.users.push(user)
      if (user.id === currentUserId) existing.hasReacted = true
    } else {
      map.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        hasReacted: user.id === currentUserId,
        users: [user],
      })
    }
  }

  return Array.from(map.values())
}
