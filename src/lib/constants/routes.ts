/**
 * Admin route constants
 * Centralized path definitions to avoid hard-coded strings across the codebase
 */
export const ADMIN_ROUTES = {
  // Root
  ROOT: '/admin',

  // Global routes
  LEAGUES: '/admin/leagues',
  TEAMS: '/admin/teams',
  PLAYERS: '/admin/players',
  USERS: '/admin/users',
  SERIES_TYPES: '/admin/series-types',
  SPECIAL_BET_TYPES: '/admin/special-bet-types',
  EVALUATORS: '/admin/evaluators',

  // Legacy routes (still in use)
  MATCHES: '/admin/matches',
  SERIES: '/admin/series',
  SPECIAL_BETS: '/admin/special-bets',

  // League-scoped routes (dynamic)
  leagueEvaluators: (leagueId: number) => `/admin/${leagueId}/evaluators`,
  leagueMatches: (leagueId: number) => `/admin/${leagueId}/matches`,
  leaguePlayers: (leagueId: number) => `/admin/${leagueId}/players`,
  leagueQuestions: (leagueId: number) => `/admin/${leagueId}/questions`,
  leagueSeries: (leagueId: number) => `/admin/${leagueId}/series`,
  leagueSpecialBets: (leagueId: number) => `/admin/${leagueId}/special-bets`,
  leagueTeams: (leagueId: number) => `/admin/${leagueId}/teams`,
  leagueUsers: (leagueId: number) => `/admin/${leagueId}/users`,
} as const

/**
 * Public route constants
 */
export const PUBLIC_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  resetPassword: (token: string) => `/reset-password/${token}`,
} as const

/**
 * API route constants
 */
export const API_ROUTES = {
  AUTH: '/api/auth',
  REGISTER: '/api/register',
} as const
