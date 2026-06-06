/**
 * Builds evaluation contexts from database entities
 * Transforms database objects into evaluator function inputs
 */

import type {
  MatchBetContext,
  SeriesBetContext,
  SpecialBetContext,
  ClosestValueContext,
  GroupStageContext,
  GroupStageConfig,
} from './types'
import { AppError } from '@/lib/error-handler'
import { SPORT_IDS } from '@/lib/constants'

// Type imports for Prisma entities
type Match = {
  homeRegularScore: number | null
  awayRegularScore: number | null
  homeFinalScore: number | null
  awayFinalScore: number | null
  isOvertime: boolean
  isShootout: boolean
  isPlayoffGame: boolean
  homeAdvanced?: boolean | null
  MatchScorer: Array<{ scorerId: number; numberOfGoals: number }>
}

type UserBet = {
  homeScore: number
  awayScore: number
  scorerId: number | null
  noScorer: boolean | null
  overtime: boolean
  homeAdvanced: boolean | null
}

type LeagueSpecialBetSerie = {
  homeTeamScore: number | null
  awayTeamScore: number | null
}

type UserSpecialBetSerie = {
  homeTeamScore: number | null
  awayTeamScore: number | null
}

type LeagueSpecialBetSingle = {
  specialBetTeamResultId: number | null
  specialBetPlayerResultId: number | null
  specialBetValue: number | null
}

type UserSpecialBetSingle = {
  teamResultId: number | null
  playerResultId: number | null
  value: number | null
  markedAsAdvancing?: boolean | null
}

/**
 * Build MatchBetContext from database entities
 * @param userBet - User's bet prediction
 * @param match - Match with results
 * @param leagueRankings - Pre-fetched rankings map (leaguePlayerId -> ranking) from getLeagueRankingsAtTime()
 * @param sportId - League's sport (drives football regulation-time normalisation)
 *
 * Football normalisation: a football bet always targets the regulation-time
 * score; OT goals and penalty shootouts only decide who advances (captured by
 * homeAdvanced). To keep evaluators sport-agnostic we collapse the "final"
 * scores onto the regulation ones and clear isOvertime/isShootout. As a result
 * `winner` and `exact_score` evaluate against regulation, matching what the
 * user actually predicted.
 */
export function buildMatchBetContext(
  userBet: UserBet,
  match: Match,
  leagueRankings: Map<number, number>,
  sportId: number
): MatchBetContext {
  // Extract scorer IDs from MatchScorer (can have multiple scorers)
  const scorerIds = match.MatchScorer.map((ms) => ms.scorerId)

  // Look up rankings from the pre-fetched map
  const scorerRankings = new Map<number, number | null>()
  for (const scorerId of scorerIds) {
    scorerRankings.set(scorerId, leagueRankings.get(scorerId) ?? null)
  }

  const isFootball = sportId === SPORT_IDS.FOOTBALL
  const homeFinalScore = isFootball ? match.homeRegularScore : match.homeFinalScore
  const awayFinalScore = isFootball ? match.awayRegularScore : match.awayFinalScore
  const isOvertime = isFootball ? false : match.isOvertime
  const isShootout = isFootball ? false : match.isShootout

  return {
    prediction: {
      homeScore: userBet.homeScore,
      awayScore: userBet.awayScore,
      scorerId: userBet.scorerId,
      noScorer: userBet.noScorer,
      overtime: userBet.overtime,
      homeAdvanced: userBet.homeAdvanced,
    },
    actual: {
      homeRegularScore: match.homeRegularScore,
      awayRegularScore: match.awayRegularScore,
      homeFinalScore,
      awayFinalScore,
      scorerIds,
      scorerRankings, // Include scorer rankings
      isOvertime,
      isShootout,
      isPlayoffGame: match.isPlayoffGame,
      homeAdvanced: match.homeAdvanced,
    },
  }
}

/**
 * Build SeriesBetContext from database entities
 */
export function buildSeriesBetContext(
  userBet: UserSpecialBetSerie,
  series: LeagueSpecialBetSerie
): SeriesBetContext {
  return {
    prediction: {
      homeTeamScore: userBet.homeTeamScore,
      awayTeamScore: userBet.awayTeamScore,
    },
    actual: {
      homeTeamScore: series.homeTeamScore,
      awayTeamScore: series.awayTeamScore,
    },
  }
}

/**
 * Build SpecialBetContext from database entities
 */
export function buildSpecialBetContext(
  userBet: UserSpecialBetSingle,
  specialBet: LeagueSpecialBetSingle
): SpecialBetContext {
  return {
    prediction: {
      teamResultId: userBet.teamResultId,
      playerResultId: userBet.playerResultId,
      value: userBet.value,
    },
    actual: {
      teamResultId: specialBet.specialBetTeamResultId,
      playerResultId: specialBet.specialBetPlayerResultId,
      value: specialBet.specialBetValue,
    },
  }
}

/**
 * Build ClosestValueContext from database entities
 * Requires all user predictions for comparison
 */
export function buildClosestValueContext(
  userBet: UserSpecialBetSingle,
  specialBet: LeagueSpecialBetSingle,
  allUserBets: UserSpecialBetSingle[]
): ClosestValueContext {
  if (userBet.value === null || specialBet.specialBetValue === null) {
    throw new AppError('Value predictions required for closest_value evaluator', 'BAD_REQUEST', 400)
  }

  // Extract all user prediction values (filter out nulls)
  const allPredictions = allUserBets
    .map((bet) => bet.value)
    .filter((val): val is number => val !== null)

  return {
    prediction: {
      value: userBet.value,
    },
    actual: {
      value: specialBet.specialBetValue,
    },
    allPredictions,
  }
}

/**
 * Build GroupStageContext from database entities
 * @param userBet - User's team prediction
 * @param specialBet - Special bet with winner and advanced teams
 * @param evaluatorConfig - Config with winnerPoints and advancePoints
 */
export function buildGroupStageContext(
  userBet: UserSpecialBetSingle,
  specialBet: LeagueSpecialBetSingle & {
    LeagueSpecialBetSingleTeamAdvanced?: Array<{ leagueTeamId: number }>
  },
  evaluatorConfig: GroupStageConfig
): GroupStageContext {
  return {
    prediction: {
      teamResultId: userBet.teamResultId,
      markedAsAdvancing: userBet.markedAsAdvancing,
    },
    actual: {
      winnerTeamId: specialBet.specialBetTeamResultId,
      advancedTeamIds:
        specialBet.LeagueSpecialBetSingleTeamAdvanced?.map(
          (adv) => adv.leagueTeamId
        ) || [],
    },
    config: evaluatorConfig,
  }
}
