/**
 * Type-safe Query Builders for Prisma
 *
 * Provides type-safe query builder functions for constructing Prisma where conditions.
 * These builders eliminate the need for `any` types when building dynamic filters
 * and ensure compile-time type safety for all database queries.
 *
 * Uses shared helpers to eliminate duplication:
 * - `applyEventStatus` - Common scheduled/finished/evaluated filter logic
 * - `buildPicksWhere` - Shared picks builder (aliased for series/specialBet/question)
 *
 * @module query-builders
 */

import type { Prisma } from '@prisma/client'

// ==================== Shared Helpers ====================

type EventStatus = 'all' | 'scheduled' | 'finished' | 'evaluated'

/**
 * Apply scheduled/finished/evaluated status filter to a where clause.
 * Used by buildSeriesWhere, buildSpecialBetsWhere, buildQuestionWhere.
 */
function applyEventStatus(
  where: { dateTime?: { gt: Date } | { lt: Date }; isEvaluated?: boolean },
  status: EventStatus | undefined,
) {
  const now = new Date()
  if (status === 'scheduled') {
    where.dateTime = { gt: now }
    where.isEvaluated = false
  } else if (status === 'finished') {
    where.dateTime = { lt: now }
    where.isEvaluated = false
  } else if (status === 'evaluated') {
    where.isEvaluated = true
  }
}

// ==================== LeagueMatch (unique structure) ====================

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

export function buildLeagueMatchWhere(filters?: {
  leagueId?: number
  status?: EventStatus
  userId?: number
}): LeagueMatchWhere {
  const where: LeagueMatchWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

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
    where.Match.dateTime = { gt: new Date() }
    where.Match.isEvaluated = false
  } else if (filters?.status === 'finished') {
    where.Match.dateTime = { lt: new Date() }
    where.Match.isEvaluated = false
  } else if (filters?.status === 'evaluated') {
    where.Match.isEvaluated = true
  }

  return where
}

// ==================== LeagueUser (trivial) ====================

export interface LeagueUserWhere {
  deletedAt: null
  leagueId?: number
}

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

// ==================== UserPicks (unique: nested Match) ====================

export interface UserPicksWhere {
  deletedAt: null
  leagueId?: number
  Match: {
    deletedAt: null
    isEvaluated?: boolean
  }
}

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

// ==================== Picks (3 identical → 1 shared) ====================

export interface PicksWhere {
  deletedAt: null
  leagueId?: number
  isEvaluated?: boolean
}

function buildPicksWhere(filters?: {
  leagueId?: number
  status?: 'evaluated' | 'unevaluated' | 'all'
}): PicksWhere {
  const where: PicksWhere = {
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

export const buildSeriesPicksWhere = buildPicksWhere
export const buildSpecialBetPicksWhere = buildPicksWhere
export const buildQuestionPicksWhere = buildPicksWhere

// ==================== Series Status ====================

export interface SeriesWhere {
  deletedAt: null
  leagueId?: number
  dateTime?: { gt: Date } | { lt: Date }
  isEvaluated?: boolean
  homeTeamScore?: { not: null }
  awayTeamScore?: { not: null }
}

export function buildSeriesWhere(filters?: {
  leagueId?: number
  status?: EventStatus
}): SeriesWhere {
  const where: SeriesWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  applyEventStatus(where, filters?.status)

  if (filters?.status === 'finished') {
    where.homeTeamScore = { not: null }
    where.awayTeamScore = { not: null }
  }

  return where
}

// ==================== Special Bets Status ====================

export interface SpecialBetsWhere {
  deletedAt: null
  leagueId?: number
  dateTime?: { gt: Date } | { lt: Date }
  isEvaluated?: boolean
  specialBetTeamResultId?: { not: null } | null
  specialBetPlayerResultId?: { not: null } | null
  specialBetValue?: { not: null } | null
}

export function buildSpecialBetsWhere(filters?: {
  leagueId?: number
  status?: EventStatus
  type?: 'all' | 'team' | 'player' | 'value'
}): SpecialBetsWhere {
  const where: SpecialBetsWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  applyEventStatus(where, filters?.status)

  if (filters?.type === 'team') {
    where.specialBetTeamResultId = { not: null }
  } else if (filters?.type === 'player') {
    where.specialBetPlayerResultId = { not: null }
  } else if (filters?.type === 'value') {
    where.specialBetValue = { not: null }
  }

  return where
}

// ==================== Question Status ====================

export interface QuestionWhere {
  deletedAt: null
  leagueId?: number
  dateTime?: { gt: Date } | { lt: Date }
  isEvaluated?: boolean
  result?: { not: null }
}

export function buildQuestionWhere(filters?: {
  leagueId?: number
  status?: EventStatus
}): QuestionWhere {
  const where: QuestionWhere = {
    deletedAt: null,
  }

  if (filters?.leagueId) {
    where.leagueId = filters.leagueId
  }

  applyEventStatus(where, filters?.status)

  if (filters?.status === 'finished') {
    where.result = { not: null }
  }

  return where
}
