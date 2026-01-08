import { z } from 'zod'

// Evaluator schemas (defined first for use in league schema)
export const evaluatorRuleSchema = z.object({
  evaluatorTypeId: z.number().int().positive(),
  points: z.number().int().min(0).max(100),
})

// League validation schemas
export const createLeagueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  sportId: z.number().int().positive('Sport is required'),
  seasonFrom: z.number().int().min(2000).max(2100),
  seasonTo: z.number().int().min(2000).max(2100),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
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

export const removeTeamSchema = z.object({
  leagueTeamId: z.number().int().positive(),
})

// Player assignment schemas
export const assignPlayerSchema = z.object({
  leagueTeamId: z.number().int().positive(),
  playerId: z.number().int().positive(),
  seasonGames: z.number().int().min(0).optional(),
  seasonGoals: z.number().int().min(0).optional(),
  clubName: z.string().max(255).optional(),
})

export type AssignPlayerInput = z.infer<typeof assignPlayerSchema>

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
}).refine((data) => data.homeTeamId !== data.awayTeamId, {
  message: 'Home and away teams must be different',
  path: ['awayTeamId'],
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>

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

// User request schemas
export const handleUserRequestSchema = z.object({
  requestId: z.number().int().positive(),
  accepted: z.boolean(),
})

export type HandleUserRequestInput = z.infer<typeof handleUserRequestSchema>

// League user schemas
export const updateLeagueUserSchema = z.object({
  leagueUserId: z.number().int().positive(),
  admin: z.boolean().optional(),
  active: z.boolean().optional(),
  paid: z.boolean().optional(),
})

export type UpdateLeagueUserInput = z.infer<typeof updateLeagueUserSchema>

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  nickname: z.string().max(255).optional(),
  shortcut: z.string().min(1, 'Shortcut is required').max(255),
  flagIcon: z.string().max(255).optional(),
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
