/**
 * Prisma query helpers to prevent N+1 queries
 * Centralized include patterns for common queries
 */

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
 */
export const specialBetInclude = {
  League: true,
  Evaluator: {
    include: {
      EvaluatorType: true,
    },
  },
  SpecialBetSingle: {
    include: {
      SpecialBetSingleType: true,
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
  _count: {
    select: { UserSpecialBetSingle: true },
  },
} as const
