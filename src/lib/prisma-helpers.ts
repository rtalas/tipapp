/**
 * Prisma query helpers to prevent N+1 queries
 * Centralized include patterns for common queries
 */

import type { Prisma } from '@prisma/client'

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

/** Include pattern for Message with user and reply-to relations */
export const messageWithRelationsInclude = {
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
} as const

/** Type-safe Message with relations, derived from Prisma include */
export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageWithRelationsInclude
}>

/**
 * Include pattern for LeagueMatch with user bets
 * Used in merged matches page to show expandable user bet rows
 * Includes all match data plus UserBet array with full user context
 */
export const leagueMatchWithBetsInclude = {
  League: true,
  Match: {
    include: {
      LeagueTeam_Match_homeTeamIdToLeagueTeam: {
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
          },
        },
      },
      LeagueTeam_Match_awayTeamIdToLeagueTeam: {
        include: {
          Team: true,
          LeaguePlayer: {
            where: { deletedAt: null },
            include: { Player: true },
          },
        },
      },
      MatchScorer: {
        where: { deletedAt: null },
        include: {
          LeaguePlayer: {
            include: { Player: true },
          },
        },
      },
      MatchPhase: true,
    },
  },
  UserBet: {
    where: { deletedAt: null },
    include: {
      LeagueUser: {
        include: {
          User: true,
        },
      },
      LeaguePlayer: {
        include: {
          Player: true,
        },
      },
    },
  },
} as const

/**
 * Include pattern for LeagueSpecialBetSingle with all related data
 * Prevents N+1 queries when fetching multiple special bets
 * Note: SpecialBetSingle is optional (nullable) for backward compatibility
 */
export const specialBetInclude = {
  League: true,
  Evaluator: {
    include: {
      EvaluatorType: true,
    },
  },
  LeagueTeam: {
    include: {
      Team: true,
    },
  },
  LeaguePlayer: {
    include: {
      Player: true,
    },
  },
  LeagueSpecialBetSingleTeamAdvanced: {
    where: { deletedAt: null },
    select: {
      leagueTeamId: true,
    },
  },
  _count: {
    select: { UserSpecialBetSingle: true },
  },
} as const
