import { unstable_cache } from 'next/cache'
import { requireLeagueMember, isBettingOpen } from '@/lib/auth/user-auth-utils'

interface CachedEntityFetcherConfig<TEntity extends { id: number }, TUserBet> {
  cacheKey: string
  cacheTags: string[]
  revalidateSeconds: number
  fetchEntities: (leagueId: number) => Promise<TEntity[]>
  fetchUserBets: (leagueUserId: number, leagueId: number) => Promise<TUserBet[]>
  getUserBetEntityId: (bet: TUserBet) => number
  getDateTime: (entity: TEntity) => Date | string
}

/**
 * Factory that creates a getUserX() function combining:
 * - Cached base entity data (shared across all users)
 * - Fresh user bets (fast query by userId)
 * - Map merge for O(1) lookup
 * - isBettingOpen computed at runtime from cached dateTime
 */
export function createCachedEntityFetcher<
  TEntity extends { id: number },
  TUserBet,
>(config: CachedEntityFetcherConfig<TEntity, TUserBet>) {
  const getCachedData = unstable_cache(
    async (leagueId: number) => config.fetchEntities(leagueId),
    [config.cacheKey],
    {
      revalidate: config.revalidateSeconds,
      tags: config.cacheTags,
    }
  )

  return async (leagueId: number) => {
    const { leagueUser } = await requireLeagueMember(leagueId)

    const [entities, userBets] = await Promise.all([
      getCachedData(leagueId),
      config.fetchUserBets(leagueUser.id, leagueId),
    ])

    const userBetMap = new Map(
      userBets.map((bet) => [config.getUserBetEntityId(bet), bet])
    )

    return entities.map((entity) => ({
      ...entity,
      isBettingOpen: isBettingOpen(config.getDateTime(entity)),
      userBet: userBetMap.get(entity.id) || null,
    }))
  }
}
