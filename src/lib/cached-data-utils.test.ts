import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as userAuthUtils from '@/lib/auth/user-auth-utils'

vi.mock('@/lib/auth/user-auth-utils', () => ({
  requireLeagueMember: vi.fn(),
  isBettingOpen: vi.fn(),
}))

const { createCachedEntityFetcher } = await import('./cached-data-utils')

const mockRequireLeagueMember = vi.mocked(userAuthUtils.requireLeagueMember)
const mockIsBettingOpen = vi.mocked(userAuthUtils.isBettingOpen)

const mockMemberResult = {
  session: { user: { id: '5' } },
  leagueUser: { id: 10, leagueId: 1, userId: 5, admin: false, active: true, paid: true },
  userId: 5,
} as any

describe('createCachedEntityFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireLeagueMember.mockResolvedValue(mockMemberResult)
  })

  it('should merge cached entities with user bets', async () => {
    mockIsBettingOpen.mockReturnValue(true)

    const fetcher = createCachedEntityFetcher({
      cacheKey: 'test-data',
      cacheTags: ['test-data'],
      revalidateSeconds: 60,
      fetchEntities: vi.fn().mockResolvedValue([
        { id: 1, dateTime: new Date('2099-01-01'), name: 'Entity 1' },
        { id: 2, dateTime: new Date('2099-01-01'), name: 'Entity 2' },
      ]),
      fetchUserBets: vi.fn().mockResolvedValue([
        { entityId: 1, score: 5 },
      ]),
      getUserBetEntityId: (bet) => bet.entityId,
      getDateTime: (entity) => entity.dateTime,
    })

    const result = await fetcher(1)

    expect(result).toHaveLength(2)
    expect(result[0].userBet).toEqual({ entityId: 1, score: 5 })
    expect(result[1].userBet).toBeNull()
  })

  it('should set isBettingOpen from entity dateTime', async () => {
    mockIsBettingOpen
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)

    const fetcher = createCachedEntityFetcher({
      cacheKey: 'test-data2',
      cacheTags: ['test-data2'],
      revalidateSeconds: 60,
      fetchEntities: vi.fn().mockResolvedValue([
        { id: 1, dateTime: new Date('2099-01-01') },
        { id: 2, dateTime: new Date('2020-01-01') },
      ]),
      fetchUserBets: vi.fn().mockResolvedValue([]),
      getUserBetEntityId: (bet: any) => bet.entityId,
      getDateTime: (entity) => entity.dateTime,
    })

    const result = await fetcher(1)

    expect(result[0].isBettingOpen).toBe(true)
    expect(result[1].isBettingOpen).toBe(false)
  })

  it('should call requireLeagueMember with correct leagueId', async () => {
    mockIsBettingOpen.mockReturnValue(true)

    const fetcher = createCachedEntityFetcher({
      cacheKey: 'test-data3',
      cacheTags: ['test-data3'],
      revalidateSeconds: 60,
      fetchEntities: vi.fn().mockResolvedValue([]),
      fetchUserBets: vi.fn().mockResolvedValue([]),
      getUserBetEntityId: (bet: any) => bet.id,
      getDateTime: (entity: any) => entity.dateTime,
    })

    await fetcher(42)

    expect(mockRequireLeagueMember).toHaveBeenCalledWith(42)
  })

  it('should pass leagueUserId and leagueId to fetchUserBets', async () => {
    mockIsBettingOpen.mockReturnValue(true)
    const fetchUserBets = vi.fn().mockResolvedValue([])

    const fetcher = createCachedEntityFetcher({
      cacheKey: 'test-data4',
      cacheTags: ['test-data4'],
      revalidateSeconds: 60,
      fetchEntities: vi.fn().mockResolvedValue([]),
      fetchUserBets,
      getUserBetEntityId: (bet: any) => bet.id,
      getDateTime: (entity: any) => entity.dateTime,
    })

    await fetcher(1)

    expect(fetchUserBets).toHaveBeenCalledWith(10, 1)
  })

  it('should preserve all entity properties in result', async () => {
    mockIsBettingOpen.mockReturnValue(true)

    const fetcher = createCachedEntityFetcher({
      cacheKey: 'test-data5',
      cacheTags: ['test-data5'],
      revalidateSeconds: 60,
      fetchEntities: vi.fn().mockResolvedValue([
        { id: 1, dateTime: new Date('2099-01-01'), name: 'Test', nested: { a: 1 } },
      ]),
      fetchUserBets: vi.fn().mockResolvedValue([]),
      getUserBetEntityId: (bet: any) => bet.id,
      getDateTime: (entity) => entity.dateTime,
    })

    const result = await fetcher(1)

    expect(result[0].name).toBe('Test')
    expect(result[0].nested).toEqual({ a: 1 })
  })

  it('should return empty array when no entities exist', async () => {
    const fetcher = createCachedEntityFetcher({
      cacheKey: 'test-data6',
      cacheTags: ['test-data6'],
      revalidateSeconds: 60,
      fetchEntities: vi.fn().mockResolvedValue([]),
      fetchUserBets: vi.fn().mockResolvedValue([]),
      getUserBetEntityId: (bet: any) => bet.id,
      getDateTime: (entity: any) => entity.dateTime,
    })

    const result = await fetcher(1)

    expect(result).toEqual([])
  })
})
