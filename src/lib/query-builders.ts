/**
 * Type-safe Query Builders for Prisma
 *
 * Provides type-safe query builder functions for constructing Prisma where conditions.
 * These builders eliminate the need for `any` types when building dynamic filters
 * and ensure compile-time type safety for all database queries.
 *
 * ## Available Builders
 * - `buildLeagueMatchWhere` - Filter league matches by status, user, league
 * - `buildMatchWhere` - Filter matches (deprecated, use buildLeagueMatchWhere)
 * - `buildSeriesWhere` - Filter series bets
 * - `buildSpecialBetWhere` - Filter special bets
 * - `buildQuestionWhere` - Filter yes/no questions
 *
 * @module query-builders
 * @example
 * ```typescript
 * const where = buildLeagueMatchWhere({
 *   leagueId: 1,
 *   status: 'scheduled',
 *   userId: 42,
 * })
 *
 * const matches = await prisma.leagueMatch.findMany({ where })
 * ```
 */

import type { Prisma } from '@prisma/client'

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
  UserBet?: Prisma.UserBetListRelationFilter
}

/**
 * Build type-safe where conditions for LeagueMatch queries
 */
export function buildLeagueMatchWhere(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
  userId?: number
}): LeagueMatchWhere {
  const now = new Date()
  const where: LeagueMatchWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  // User filter: show only matches where this user has bets
  if (filters?.userId) {
    where.UserBet = {
      some: {
        deletedAt: null,
        LeagueUser: {
          userId: filters.userId,
        },
      },
    }
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

/**
 * Where conditions for User Picks (LeagueMatch with UserBets)
 */
export interface UserPicksWhere {
  deletedAt: null
  leagueId?: number
  Match: {
    deletedAt: null
    isEvaluated?: boolean
  }
}

/**
 * Build type-safe where conditions for User Picks queries
 */
export function buildUserPicksWhere(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}): UserPicksWhere {
  const where: UserPicksWhere = {
    deletedAt: null,
    Match: {
      deletedAt: null,
    },
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  if (filters?.status === 'evaluated') {
    where.Match.isEvaluated = true
  } else if (filters?.status === 'unevaluated') {
    where.Match.isEvaluated = false
  }

  return where
}

/**
 * Where conditions for LeagueSpecialBetSerie filters
 */
export interface SeriesWhere {
  deletedAt: null
  leagueId?: number
  dateTime?: { gt: Date } | { lt: Date }
  isEvaluated?: boolean
  homeTeamScore?: { not: null }
  awayTeamScore?: { not: null }
}

/**
 * Build type-safe where conditions for Series queries
 */
export function buildSeriesWhere(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
}): SeriesWhere {
  const now = new Date()
  const where: SeriesWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  if (filters?.status === 'scheduled') {
    where.dateTime = { gt: now }
    where.isEvaluated = false
  } else if (filters?.status === 'finished') {
    where.dateTime = { lt: now }
    where.isEvaluated = false
    where.homeTeamScore = { not: null }
    where.awayTeamScore = { not: null }
  } else if (filters?.status === 'evaluated') {
    where.isEvaluated = true
  }

  return where
}

/**
 * Where conditions for Series Picks (LeagueSpecialBetSerie with UserSpecialBetSerie)
 */
export interface SeriesPicksWhere {
  deletedAt: null
  leagueId?: number
  isEvaluated?: boolean
}

/**
 * Build type-safe where conditions for Series Picks queries
 */
export function buildSeriesPicksWhere(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}): SeriesPicksWhere {
  const where: SeriesPicksWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  if (filters?.status === 'evaluated') {
    where.isEvaluated = true
  } else if (filters?.status === 'unevaluated') {
    where.isEvaluated = false
  }

  return where
}

/**
 * Where conditions for LeagueSpecialBetSingle filters
 */
export interface SpecialBetsWhere {
  deletedAt: null
  leagueId?: number
  dateTime?: { gt: Date } | { lt: Date }
  isEvaluated?: boolean
  specialBetTeamResultId?: { not: null } | null
  specialBetPlayerResultId?: { not: null } | null
  specialBetValue?: { not: null } | null
}

/**
 * Build type-safe where conditions for Special Bets queries
 */
export function buildSpecialBetsWhere(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
  type?: 'all' | 'team' | 'player' | 'value'
}): SpecialBetsWhere {
  const now = new Date()
  const where: SpecialBetsWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  if (filters?.status === 'scheduled') {
    where.dateTime = { gt: now }
    where.isEvaluated = false
  } else if (filters?.status === 'finished') {
    where.dateTime = { lt: now }
    where.isEvaluated = false
  } else if (filters?.status === 'evaluated') {
    where.isEvaluated = true
  }

  if (filters?.type === 'team') {
    where.specialBetTeamResultId = { not: null }
  } else if (filters?.type === 'player') {
    where.specialBetPlayerResultId = { not: null }
  } else if (filters?.type === 'value') {
    where.specialBetValue = { not: null }
  }

  return where
}

/**
 * Where conditions for Special Bet Picks (LeagueSpecialBetSingle with UserSpecialBetSingle)
 */
export interface SpecialBetPicksWhere {
  deletedAt: null
  leagueId?: number
  isEvaluated?: boolean
}

/**
 * Build type-safe where conditions for Special Bet Picks queries
 */
export function buildSpecialBetPicksWhere(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}): SpecialBetPicksWhere {
  const where: SpecialBetPicksWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  if (filters?.status === 'evaluated') {
    where.isEvaluated = true
  } else if (filters?.status === 'unevaluated') {
    where.isEvaluated = false
  }

  return where
}

/**
 * Where conditions for LeagueSpecialBetQuestion filters
 */
export interface QuestionWhere {
  deletedAt: null
  leagueId?: number
  dateTime?: { gt: Date } | { lt: Date }
  isEvaluated?: boolean
  result?: { not: null }
}

/**
 * Build type-safe where conditions for Question queries
 */
export function buildQuestionWhere(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
}): QuestionWhere {
  const now = new Date()
  const where: QuestionWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  if (filters?.status === 'scheduled') {
    where.dateTime = { gt: now }
    where.isEvaluated = false
  } else if (filters?.status === 'finished') {
    where.dateTime = { lt: now }
    where.isEvaluated = false
    where.result = { not: null }
  } else if (filters?.status === 'evaluated') {
    where.isEvaluated = true
  }

  return where
}

/**
 * Where conditions for Question Picks
 */
export interface QuestionPicksWhere {
  deletedAt: null
  leagueId?: number
  isEvaluated?: boolean
}

/**
 * Build type-safe where conditions for Question Picks queries
 */
export function buildQuestionPicksWhere(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}): QuestionPicksWhere {
  const where: QuestionPicksWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  if (filters?.status === 'evaluated') {
    where.isEvaluated = true
  } else if (filters?.status === 'unevaluated') {
    where.isEvaluated = false
  }

  return where
}
