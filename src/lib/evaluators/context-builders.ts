/**
 * Builds evaluation contexts from database entities
 * Transforms database objects into evaluator function inputs
 */

import type {
  MatchBetContext,
  SeriesBetContext,
  SpecialBetContext,
  ClosestValueContext,
} from './types'
import type { QuestionContext } from './question'

// Type imports for Prisma entities
type Match = {
  homeRegularScore: number | null
  awayRegularScore: number | null
  homeFinalScore: number | null
  awayFinalScore: number | null
  isOvertime: boolean | null
  isShootout: boolean | null
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
}

/**
 * Build MatchBetContext from database entities
 */
export function buildMatchBetContext(
  userBet: UserBet,
  match: Match
): MatchBetContext {
  // Extract scorer IDs from MatchScorer (can have multiple scorers)
  const scorerIds = match.MatchScorer.map((ms) => ms.scorerId)

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
      homeFinalScore: match.homeFinalScore,
      awayFinalScore: match.awayFinalScore,
      scorerIds,
      isOvertime: match.isOvertime,
      isShootout: match.isShootout,
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
    throw new Error('Value predictions required for closest_value evaluator')
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
 * Build QuestionContext from database entities
 * Converts numeric values to yes/no answers
 * - 1 = yes
 * - 0 = no
 * - null = not picked
 */
export function buildQuestionContext(
  userBet: UserSpecialBetSingle,
  specialBet: LeagueSpecialBetSingle
): QuestionContext {
  // Convert numeric values to yes/no
  const convertToAnswer = (value: number | null): 'yes' | 'no' | null => {
    if (value === null) return null
    return value === 1 ? 'yes' : 'no'
  }

  const userAnswer = convertToAnswer(userBet.value)
  const correctAnswer = convertToAnswer(specialBet.specialBetValue)

  if (correctAnswer === null) {
    throw new Error('Question must have a correct answer set')
  }

  return {
    prediction: {
      answer: userAnswer,
    },
    actual: {
      correctAnswer,
    },
  }
}
