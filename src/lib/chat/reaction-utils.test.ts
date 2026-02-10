import { describe, it, expect } from 'vitest'
import { groupReactions } from './reaction-utils'

const makeReaction = (emoji: string, userId: number, firstName: string, username: string) => ({
  id: Math.random(),
  messageId: 1,
  leagueUserId: userId * 10,
  emoji,
  createdAt: new Date(),
  deletedAt: null,
  LeagueUser: {
    id: userId * 10,
    leagueId: 1,
    userId,
    paid: false,
    active: true,
    admin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    lastChatReadAt: null,
    User: { id: userId, firstName, lastName: 'User', username },
  },
})

describe('groupReactions', () => {
  it('should return empty array for no reactions', () => {
    const result = groupReactions([] as any, 1)
    expect(result).toEqual([])
  })

  it('should group reactions by emoji with correct counts', () => {
    const reactions = [
      makeReaction('👍', 1, 'Alice', 'alice'),
      makeReaction('👍', 2, 'Bob', 'bob'),
      makeReaction('❤️', 3, 'Charlie', 'charlie'),
    ]

    const result = groupReactions(reactions as any, 99)

    expect(result).toHaveLength(2)
    const thumbs = result.find((r) => r.emoji === '👍')!
    expect(thumbs.count).toBe(2)
    expect(thumbs.users).toHaveLength(2)
    const heart = result.find((r) => r.emoji === '❤️')!
    expect(heart.count).toBe(1)
  })

  it('should identify current user reactions (hasReacted)', () => {
    const reactions = [
      makeReaction('👍', 1, 'Alice', 'alice'),
      makeReaction('👍', 5, 'Me', 'me'),
      makeReaction('❤️', 2, 'Bob', 'bob'),
    ]

    const result = groupReactions(reactions as any, 5)

    const thumbs = result.find((r) => r.emoji === '👍')!
    expect(thumbs.hasReacted).toBe(true)
    const heart = result.find((r) => r.emoji === '❤️')!
    expect(heart.hasReacted).toBe(false)
  })

  it('should handle single reaction', () => {
    const reactions = [makeReaction('🔥', 1, 'Alice', 'alice')]

    const result = groupReactions(reactions as any, 1)

    expect(result).toHaveLength(1)
    expect(result[0].emoji).toBe('🔥')
    expect(result[0].count).toBe(1)
    expect(result[0].hasReacted).toBe(true)
    expect(result[0].users).toHaveLength(1)
  })

  it('should collect user info for tooltip display', () => {
    const reactions = [
      makeReaction('👍', 1, 'Alice', 'alice'),
      makeReaction('👍', 2, 'Bob', 'bob'),
    ]

    const result = groupReactions(reactions as any, 99)

    const thumbs = result.find((r) => r.emoji === '👍')!
    expect(thumbs.users[0]).toEqual(
      expect.objectContaining({ id: 1, firstName: 'Alice', username: 'alice' })
    )
    expect(thumbs.users[1]).toEqual(
      expect.objectContaining({ id: 2, firstName: 'Bob', username: 'bob' })
    )
  })
})
