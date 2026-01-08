/**
 * Type-safe query builders for Prisma filters
 * Eliminates need for `any` types in dynamic where conditions
 */

/**
 * Where conditions for LeagueMatch filters
 */
export interface LeagueMatchWhere {
  deletedAt: null
  leagueId?: number
  Match?: {
    deletedAt: null
    dateTime?: { gt: Date } | { lt: Date }
    isEvaluated?: boolean
    homeRegularScore?: { not: null }
    awayRegularScore?: { not: null }
  }
}

/**
 * Build type-safe where conditions for LeagueMatch queries
 */
export function buildLeagueMatchWhere(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
}): LeagueMatchWhere {
  const now = new Date()
  const where: LeagueMatchWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  where.Match = {
    deletedAt: null,
  }

  if (filters?.status === 'scheduled') {
    where.Match.dateTime = { gt: now }
    where.Match.isEvaluated = false
  } else if (filters?.status === 'finished') {
    where.Match.dateTime = { lt: now }
    where.Match.isEvaluated = false
  } else if (filters?.status === 'evaluated') {
    where.Match.isEvaluated = true
  }

  return where
}

/**
 * Where conditions for pending matches (finished but not evaluated)
 */
export interface PendingMatchWhere {
  deletedAt: null
  leagueId?: number
  Match: {
    deletedAt: null
    dateTime: { lt: Date }
    isEvaluated: false
    homeRegularScore: { not: null }
    awayRegularScore: { not: null }
  }
}

/**
 * Build type-safe where conditions for pending matches
 */
export function buildPendingMatchWhere(filters?: {
  leagueId?: number
}): PendingMatchWhere {
  const now = new Date()
  return {
    deletedAt: null,
    ...(filters?.leagueId && { leagueId: filters.leagueId }),
    Match: {
      deletedAt: null,
      dateTime: { lt: now },
      isEvaluated: false,
      homeRegularScore: { not: null },
      awayRegularScore: { not: null },
    },
  }
}

/**
 * Where conditions for LeagueUser filters
 */
export interface LeagueUserWhere {
  deletedAt: null
  leagueId?: number
}

/**
 * Build type-safe where conditions for LeagueUser queries
 */
export function buildLeagueUserWhere(filters?: {
  leagueId?: number
}): LeagueUserWhere {
  const where: LeagueUserWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  return where
}
