import { z } from 'zod'

// Delete by ID schema (used for delete operations)
export const deleteByIdSchema = z.object({
  id: z.number().int().positive('ID must be a positive integer'),
})

export type DeleteByIdInput = z.infer<typeof deleteByIdSchema>

// Evaluator schemas (defined first for use in league schema)
const evaluatorRuleSchema = z.object({
  evaluatorTypeId: z.number().int().positive(),
  points: z.number().int().min(0).max(100),
})

// Individual Evaluator validation schemas
export const createEvaluatorSchema = z.object({
  leagueId: z.number().int().positive('League is required'),
  evaluatorTypeId: z.number().int().positive('Evaluator type is required'),
  name: z.string().min(1, 'Name is required').max(255),
  points: z.number().int().min(0, 'Points cannot be negative').max(100),
})

export type CreateEvaluatorInput = z.infer<typeof createEvaluatorSchema>

export const updateEvaluatorPointsSchema = z.object({
  evaluatorId: z.number().int().positive('Evaluator ID is required'),
  points: z.number().int().min(0, 'Points cannot be negative').max(100),
})

export type UpdateEvaluatorPointsInput = z.infer<typeof updateEvaluatorPointsSchema>

export const updateEvaluatorNameSchema = z.object({
  evaluatorId: z.number().int().positive('Evaluator ID is required'),
  name: z.string().min(1, 'Name cannot be empty').max(255),
})

export type UpdateEvaluatorNameInput = z.infer<typeof updateEvaluatorNameSchema>

// Team group update schema
export const updateTeamGroupSchema = z.object({
  leagueTeamId: z.number().int().positive('League Team ID is required'),
  group: z.string().max(10).nullable(),
})

export type UpdateTeamGroupInput = z.infer<typeof updateTeamGroupSchema>


// League validation schemas
export const createLeagueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sportId: z.number().int().positive('Sport is required'),
  seasonFrom: z.number().int().min(2000).max(2100),
  seasonTo: z.number().int().min(2000).max(2100),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  infoText: z.string().max(2000).optional().nullable(),
  evaluatorRules: z.array(evaluatorRuleSchema).optional(),
}).refine((data) => data.seasonTo >= data.seasonFrom, {
  message: 'Season end must be greater than or equal to season start',
  path: ['seasonTo'],
})

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>

export const updateLeagueSchema = createLeagueSchema.partial().extend({
  id: z.number().int().positive(),
})

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>

export const updateEvaluatorSchema = z.object({
  leagueId: z.number().int().positive(),
  rules: z.array(evaluatorRuleSchema),
})

export type UpdateEvaluatorInput = z.infer<typeof updateEvaluatorSchema>

// Team assignment schemas
export const assignTeamSchema = z.object({
  leagueId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  group: z.string().max(10).optional(),
})

export type AssignTeamInput = z.infer<typeof assignTeamSchema>

// Player assignment schemas
export const assignPlayerSchema = z.object({
  leagueTeamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  seasonGames: z.number().int().min(0).optional(),
  seasonGoals: z.number().int().min(0).optional(),
  clubName: z.string().max(255).optional(),
})

export type AssignPlayerInput = z.infer<typeof assignPlayerSchema>

export const updateTopScorerRankingSchema = z.object({
  leaguePlayerId: z.number().int().positive('League Player ID is required'),
  topScorerRanking: z.number().int().min(0).max(4).nullable(),
})

export type UpdateTopScorerRankingInput = z.infer<typeof updateTopScorerRankingSchema>

// Match validation schemas
export const createMatchSchema = z.object({
  leagueId: z.number().int().positive(),
  homeTeamId: z.number().int().positive(),
  awayTeamId: z.number().int().positive(),
  dateTime: z
    .date()
    .refine((date) => date > new Date(), {
      message: 'Match date must be in the future',
    }),
  isPlayoffGame: z.boolean().default(false),
  isDoubled: z.boolean().default(false),
  matchPhaseId: z.number().int().positive().nullable().optional(),
  gameNumber: z.number().int().min(1).max(7).nullable().optional(),
}).refine((data) => data.homeTeamId !== data.awayTeamId, {
  message: 'Home and away teams must be different',
  path: ['awayTeamId'],
}).refine((data) => {
  // If gameNumber provided, matchPhaseId must also be provided
  if (data.gameNumber && !data.matchPhaseId) {
    return false
  }
  return true
}, {
  message: 'Game number requires a match phase',
  path: ['gameNumber'],
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>

export const updateMatchSchema = z.object({
  matchId: z.number().int().positive(),
  dateTime: z.date().optional(),
  matchPhaseId: z.number().int().positive().nullable().optional(),
  gameNumber: z.number().int().min(1).max(7).nullable().optional(),
}).refine((data) => {
  // If gameNumber provided, matchPhaseId must also be provided
  if (data.gameNumber && !data.matchPhaseId) {
    return false
  }
  return true
}, {
  message: 'Game number requires a match phase',
  path: ['gameNumber'],
})

export type UpdateMatchInput = z.infer<typeof updateMatchSchema>

// Match Phase validation schemas
export const createMatchPhaseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  rank: z.number().int().min(0, 'Rank must be non-negative').default(0),
  bestOf: z.number().int().min(1).max(7).nullable().optional(),
})

export type CreateMatchPhaseInput = z.infer<typeof createMatchPhaseSchema>

export const updateMatchPhaseSchema = createMatchPhaseSchema.partial().extend({
  id: z.number().int().positive(),
})

export type UpdateMatchPhaseInput = z.infer<typeof updateMatchPhaseSchema>

export const updateMatchResultSchema = z.object({
  matchId: z.number().int().positive(),
  homeRegularScore: z.number().int().min(0),
  awayRegularScore: z.number().int().min(0),
  homeFinalScore: z.number().int().min(0).optional(),
  awayFinalScore: z.number().int().min(0).optional(),
  isOvertime: z.boolean().default(false),
  isShootout: z.boolean().default(false),
  scorers: z.array(z.object({
    playerId: z.number().int().positive(),
    numberOfGoals: z.number().int().min(1).default(1),
  })).optional(),
})

export type UpdateMatchResultInput = z.infer<typeof updateMatchResultSchema>

// User request schemas (internal use only)
const handleUserRequestSchema = z.object({
  requestId: z.number().int().positive(),
  accepted: z.boolean(),
})

type HandleUserRequestInput = z.infer<typeof handleUserRequestSchema>

// League user schemas (internal use only)
const updateLeagueUserSchema = z.object({
  leagueUserId: z.number().int().positive(),
  admin: z.boolean().optional(),
  active: z.boolean().optional(),
  paid: z.boolean().optional(),
})

type UpdateLeagueUserInput = z.infer<typeof updateLeagueUserSchema>

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  nickname: z.string().max(255).optional(),
  shortcut: z.string().min(1, 'Shortcut is required').max(255),
  flagIcon: z.string().max(255).optional(),
  flagType: z.enum(['icon', 'path']).optional(),
  sportId: z.number().int().positive('Sport is required'),
  externalId: z.number().int().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>

export const updateTeamSchema = createTeamSchema.partial().extend({
  id: z.number().int().positive(),
})

export type UpdateTeamInput = z.infer<typeof updateTeamSchema>

// Player validation schemas
export const createPlayerSchema = z
  .object({
    firstName: z.string().max(255).optional(),
    lastName: z.string().optional(),
    position: z.string().max(255).optional(),
    isActive: z.boolean().default(true),
    externalId: z.number().int().optional(),
  })
  .refine((data) => data.firstName || data.lastName, {
    message: 'At least one name field is required',
    path: ['firstName'],
  })

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>

export const updatePlayerSchema = createPlayerSchema.partial().extend({
  id: z.number().int().positive(),
})

export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>

// UserBet validation schemas
export const createUserBetSchema = z
  .object({
    leagueMatchId: z.number().int().positive('League Match ID is required'),
    leagueUserId: z.number().int().positive('League User ID is required'),
    homeScore: z.number().int().min(0, 'Home score must be non-negative'),
    awayScore: z.number().int().min(0, 'Away score must be non-negative'),
    scorerId: z.number().int().positive().optional(),
    noScorer: z.boolean().optional(),
    overtime: z.boolean().default(false),
    homeAdvanced: z.boolean().optional(), // true = home, false = away, undefined = null
  })
  .refine(
    (data) => {
      // Mutual exclusivity: cannot set both scorerId and noScorer
      if (data.noScorer === true && data.scorerId !== undefined) return false
      if (data.scorerId !== undefined && data.noScorer === true) return false
      return true
    },
    {
      message: 'Cannot set both scorer and no scorer',
      path: ['scorerId'],
    }
  )

export type CreateUserBetInput = z.infer<typeof createUserBetSchema>

export const updateUserBetSchema = createUserBetSchema.partial().extend({
  id: z.number().int().positive('Bet ID is required'),
})

export type UpdateUserBetInput = z.infer<typeof updateUserBetSchema>

// Series validation schemas
export const createSeriesSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
  specialBetSerieId: z.number().int().positive('Series type ID is required'),
  homeTeamId: z.number().int().positive('Home team ID is required'),
  awayTeamId: z.number().int().positive('Away team ID is required'),
  dateTime: z
    .date()
    .refine((date) => date > new Date(), {
      message: 'Series date must be in the future',
    }),
}).refine((data) => data.homeTeamId !== data.awayTeamId, {
  message: 'Home and away teams must be different',
  path: ['awayTeamId'],
})

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>

export const updateSeriesResultSchema = z.object({
  seriesId: z.number().int().positive('Series ID is required'),
  homeTeamScore: z.number().int().min(0).max(7, 'Score must be between 0 and 7'),
  awayTeamScore: z.number().int().min(0).max(7, 'Score must be between 0 and 7'),
}).refine((data) => data.homeTeamScore >= 4 || data.awayTeamScore >= 4, {
  message: 'At least one team must have 4 wins',
  path: ['homeTeamScore'],
})

export type UpdateSeriesResultInput = z.infer<typeof updateSeriesResultSchema>

// User Series Bet validation schemas
export const createUserSeriesBetSchema = z.object({
  leagueSpecialBetSerieId: z.number().int().positive('Series ID is required'),
  leagueUserId: z.number().int().positive('League User ID is required'),
  homeTeamScore: z.number().int().min(0).max(7, 'Score must be between 0 and 7'),
  awayTeamScore: z.number().int().min(0).max(7, 'Score must be between 0 and 7'),
}).refine((data) => data.homeTeamScore >= 4 || data.awayTeamScore >= 4, {
  message: 'At least one team must have 4 wins',
  path: ['homeTeamScore'],
})

export type CreateUserSeriesBetInput = z.infer<typeof createUserSeriesBetSchema>

export const updateUserSeriesBetSchema = createUserSeriesBetSchema.partial().extend({
  id: z.number().int().positive('Bet ID is required'),
})

export type UpdateUserSeriesBetInput = z.infer<typeof updateUserSeriesBetSchema>

// Special Bet validation schemas
export const createSpecialBetSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
  specialBetSingleId: z.number().int().positive('Special Bet Type ID is required'),
  points: z.number().int().min(0, 'Points must be non-negative').default(0),
  dateTime: z
    .date()
    .refine((date) => date > new Date(), {
      message: 'Special bet date must be in the future',
    }),
})

export type CreateSpecialBetInput = z.infer<typeof createSpecialBetSchema>

export const updateSpecialBetResultSchema = z.object({
  specialBetId: z.number().int().positive('Special Bet ID is required'),
  specialBetTeamResultId: z.number().int().positive().optional(),
  specialBetPlayerResultId: z.number().int().positive().optional(),
  specialBetValue: z.number().int().optional(),
}).refine((data) => {
  const fieldsSet = [
    data.specialBetTeamResultId !== undefined,
    data.specialBetPlayerResultId !== undefined,
    data.specialBetValue !== undefined,
  ].filter(Boolean).length

  return fieldsSet === 1
}, {
  message: 'Exactly one result field must be set (team OR player OR value)',
  path: ['specialBetTeamResultId'],
})

export type UpdateSpecialBetResultInput = z.infer<typeof updateSpecialBetResultSchema>

// User Special Bet validation schemas
export const createUserSpecialBetSchema = z.object({
  leagueSpecialBetSingleId: z.number().int().positive('Special Bet ID is required'),
  leagueUserId: z.number().int().positive('League User ID is required'),
  teamResultId: z.number().int().positive().optional(),
  playerResultId: z.number().int().positive().optional(),
  value: z.number().int().optional(),
}).refine((data) => {
  const fieldsSet = [
    data.teamResultId !== undefined,
    data.playerResultId !== undefined,
    data.value !== undefined,
  ].filter(Boolean).length

  return fieldsSet === 1
}, {
  message: 'Exactly one prediction field must be set (team OR player OR value)',
  path: ['teamResultId'],
})

export type CreateUserSpecialBetInput = z.infer<typeof createUserSpecialBetSchema>

export const updateUserSpecialBetSchema = z.object({
  id: z.number().int().positive('Bet ID is required'),
  teamResultId: z.number().int().positive().optional(),
  playerResultId: z.number().int().positive().optional(),
  value: z.number().int().optional(),
}).refine((data) => {
  const fieldsSet = [
    data.teamResultId !== undefined,
    data.playerResultId !== undefined,
    data.value !== undefined,
  ].filter(Boolean).length

  return fieldsSet === 1
}, {
  message: 'Exactly one prediction field must be set (team OR player OR value)',
  path: ['teamResultId'],
})

export type UpdateUserSpecialBetInput = z.infer<typeof updateUserSpecialBetSchema>

// Special Bet Type (Global) validation schemas
export const createSpecialBetTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sportId: z.number().int().positive('Sport is required'),
  specialBetSingleTypeId: z.number().int().positive('Type is required'),
})

export type CreateSpecialBetTypeInput = z.infer<typeof createSpecialBetTypeSchema>

export const updateSpecialBetTypeSchema = createSpecialBetTypeSchema.partial().extend({
  id: z.number().int().positive(),
})

export type UpdateSpecialBetTypeInput = z.infer<typeof updateSpecialBetTypeSchema>

// Series Type (Global) validation schemas
export const createSeriesTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  bestOf: z.number().int().min(1, 'Best of must be at least 1').max(7, 'Best of cannot exceed 7'),
})

export type CreateSeriesTypeInput = z.infer<typeof createSeriesTypeSchema>

export const updateSeriesTypeSchema = createSeriesTypeSchema.partial().extend({
  id: z.number().int().positive(),
})

export type UpdateSeriesTypeInput = z.infer<typeof updateSeriesTypeSchema>

// Question validation schemas
export const createQuestionSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
  text: z.string().min(10, 'Question must be at least 10 characters').max(500, 'Question must not exceed 500 characters'),
  dateTime: z
    .date()
    .refine((date) => date > new Date(), {
      message: 'Question date must be in the future',
    }),
})

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>

export const updateQuestionSchema = z.object({
  id: z.number().int().positive('Question ID is required'),
  text: z.string().min(10, 'Question must be at least 10 characters').max(500, 'Question must not exceed 500 characters').optional(),
  dateTime: z.date().optional(),
})

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>

export const updateQuestionResultSchema = z.object({
  questionId: z.number().int().positive('Question ID is required'),
  result: z.boolean(),
})

export type UpdateQuestionResultInput = z.infer<typeof updateQuestionResultSchema>

// User question bet schemas
export const createUserQuestionBetSchema = z.object({
  leagueSpecialBetQuestionId: z.number().int().positive('Question ID is required'),
  leagueUserId: z.number().int().positive('League User ID is required'),
  userBet: z.boolean(),
})

export type CreateUserQuestionBetInput = z.infer<typeof createUserQuestionBetSchema>

export const updateUserQuestionBetSchema = createUserQuestionBetSchema.partial().extend({
  id: z.number().int().positive('Bet ID is required'),
})

export type UpdateUserQuestionBetInput = z.infer<typeof updateUserQuestionBetSchema>

// Message validation schemas
export const sendMessageSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
  text: z.string().min(1, 'Message cannot be empty').max(1000, 'Message must not exceed 1000 characters'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>

export const getMessagesSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
  limit: z.number().int().min(1).max(100).default(50),
  before: z.date().optional(),
})

export type GetMessagesInput = z.infer<typeof getMessagesSchema>

export const deleteMessageSchema = z.object({
  id: z.number().int().positive('Message ID is required'),
})

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>

// League chat settings schema
export const updateLeagueChatSettingsSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
  isChatEnabled: z.boolean().optional(),
  suspend: z.boolean().optional(),
})

export type UpdateLeagueChatSettingsInput = z.infer<typeof updateLeagueChatSettingsSchema>

// League prize validation schemas
const prizeTierSchema = z.object({
  rank: z.number().int().min(1, 'Rank must be at least 1').max(10, 'Maximum 10 prize tiers allowed'),
  amount: z.number().int().min(0, 'Amount cannot be negative'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('CZK'),
  label: z.string().max(100, 'Label must not exceed 100 characters').optional(),
})

export const updateLeaguePrizesSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
  prizes: z.array(prizeTierSchema).max(10, 'Maximum 10 prize tiers allowed'),
}).refine((data) => {
  // Ensure unique ranks
  const ranks = data.prizes.map(p => p.rank)
  return new Set(ranks).size === ranks.length
}, {
  message: 'Prize ranks must be unique',
  path: ['prizes'],
})

export type UpdateLeaguePrizesInput = z.infer<typeof updateLeaguePrizesSchema>
export type PrizeTier = z.infer<typeof prizeTierSchema>
