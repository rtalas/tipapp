/**
 * Prisma query helpers to prevent N+1 queries
 * Centralized include patterns for common queries
 */

/**
 * Include pattern for LeagueMatch with all related data
 * Prevents N+1 queries when fetching multiple matches
 */
export const leagueMatchInclude = {
  League: true,
  Match: {
    include: {
      LeagueTeam_Match_homeTeamIdToLeagueTeam: {
        include: {
          Team: true,
        },
      },
      LeagueTeam_Match_awayTeamIdToLeagueTeam: {
        include: {
          Team: true,
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
} as const

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
 * Include pattern for Match with evaluator data
 * Used in evaluateMatch to load evaluators in bulk
 */
export const matchWithEvaluatorsInclude = {
  LeagueMatch: {
    include: {
      League: {
        include: {
          Evaluator: {
            where: { deletedAt: null },
            include: { EvaluatorType: true },
          },
        },
      },
      UserBet: {
        where: { deletedAt: null },
      },
    },
  },
  MatchScorer: true,
} as const

/**
 * Include pattern for League with evaluators and teams
 * Prevents N+1 when fetching league setups
 */
const leagueWithEvaluatorsInclude = {
  Sport: true,
  Evaluator: {
    where: { deletedAt: null },
    include: { EvaluatorType: true },
  },
  LeagueTeam: {
    where: { deletedAt: null },
    include: {
      Team: true,
      LeaguePlayer: {
        where: { deletedAt: null },
        include: { Player: true },
      },
    },
    orderBy: { Team: { name: 'asc' as const } },
  },
} as const

/**
 * Include pattern for LeagueUser with full context
 * Prevents N+1 when fetching league users
 */
const leagueUserInclude = {
  User: true,
  League: true,
} as const

/**
 * Include pattern for Team with sport and league info
 * Prevents N+1 when listing teams
 */
const teamWithSportInclude = {
  Sport: true,
  _count: {
    select: { LeagueTeam: true },
  },
} as const

/**
 * Include pattern for Player with league counts
 * Prevents N+1 when listing players
 */
const playerWithCountsInclude = {
  _count: {
    select: { LeaguePlayer: true },
  },
} as const

/**
 * Include pattern for LeagueSpecialBetSerie with all related data
 * Prevents N+1 queries when fetching multiple series
 */
export const seriesInclude = {
  League: true,
  SpecialBetSerie: true,
  LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
    include: {
      Team: true,
    },
  },
  LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
    include: {
      Team: true,
    },
  },
  _count: {
    select: { UserSpecialBetSerie: true },
  },
} as const

/**
 * Include pattern for Series with user bets
 * Used in series-picks page to show all predictions
 */
const seriesWithBetsInclude = {
  League: true,
  SpecialBetSerie: true,
  LeagueTeam_LeagueSpecialBetSerie_homeTeamIdToLeagueTeam: {
    include: {
      Team: true,
    },
  },
  LeagueTeam_LeagueSpecialBetSerie_awayTeamIdToLeagueTeam: {
    include: {
      Team: true,
    },
  },
  UserSpecialBetSerie: {
    where: { deletedAt: null },
    include: {
      LeagueUser: {
        include: {
          User: true,
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

/**
 * Include pattern for Special Bets with user bets
 * Used in special-bet-picks page to show all predictions
 */
const specialBetWithBetsInclude = {
  League: true,
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
  UserSpecialBetSingle: {
    where: { deletedAt: null },
    include: {
      LeagueUser: {
        include: {
          User: true,
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
    },
  },
} as const

/**
 * Include object for LeagueSpecialBetQuestion queries (basic)
 */
export const questionInclude = {
  League: true,
  _count: {
    select: { UserSpecialBetQuestion: true },
  },
} as const

/**
 * Include object for LeagueSpecialBetQuestion with user bets (full)
 */
const questionWithBetsInclude = {
  League: true,
  UserSpecialBetQuestion: {
    where: { deletedAt: null },
    include: {
      LeagueUser: {
        include: {
          User: true,
        },
      },
    },
  },
} as const
