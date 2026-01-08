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
export const leagueWithEvaluatorsInclude = {
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
export const leagueUserInclude = {
  User: true,
  League: true,
} as const

/**
 * Include pattern for Team with sport and league info
 * Prevents N+1 when listing teams
 */
export const teamWithSportInclude = {
  Sport: true,
  _count: {
    select: { LeagueTeam: true },
  },
} as const

/**
 * Include pattern for Player with league counts
 * Prevents N+1 when listing players
 */
export const playerWithCountsInclude = {
  _count: {
    select: { LeaguePlayer: true },
  },
} as const
