import { z } from 'zod'

// Match bet schema (user-facing, without leagueUserId - determined from session)
export const userMatchBetSchema = z
  .object({
    leagueMatchId: z.number().int().positive('Match ID is required'),
    homeScore: z.number().int().min(0, 'Score cannot be negative'),
    awayScore: z.number().int().min(0, 'Score cannot be negative'),
    scorerId: z.number().int().positive().optional().nullable(),
    noScorer: z.boolean().optional().nullable(),
    overtime: z.boolean().default(false),
    homeAdvanced: z.boolean().optional().nullable(),
  })
  .refine(
    (data) => {
      // Mutual exclusivity: cannot set both scorerId and noScorer
      if (data.noScorer === true && data.scorerId !== null) return false
      if (data.scorerId !== null && data.noScorer === true) return false
      return true
    },
    {
      message: 'Cannot set both scorer and no scorer',
      path: ['scorerId'],
    }
  )

export type UserMatchBetInput = z.infer<typeof userMatchBetSchema>

// Series bet schema (user-facing)
export const userSeriesBetSchema = z
  .object({
    leagueSpecialBetSerieId: z.number().int().positive('Series ID is required'),
    homeTeamScore: z.number().int().min(0).max(7, 'Score must be between 0 and 7'),
    awayTeamScore: z.number().int().min(0).max(7, 'Score must be between 0 and 7'),
  })
  .refine((data) => data.homeTeamScore >= 4 || data.awayTeamScore >= 4, {
    message: 'At least one team must have 4 wins to complete the series',
    path: ['homeTeamScore'],
  })

export type UserSeriesBetInput = z.infer<typeof userSeriesBetSchema>

// Special bet schema (user-facing)
export const userSpecialBetSchema = z
  .object({
    leagueSpecialBetSingleId: z
      .number()
      .int()
      .positive('Special Bet ID is required'),
    teamResultId: z.number().int().positive().optional().nullable(),
    playerResultId: z.number().int().positive().optional().nullable(),
    value: z.number().int().optional().nullable(),
  })
  .refine(
    (data) => {
      const fieldsSet = [
        data.teamResultId != null,
        data.playerResultId != null,
        data.value != null,
      ].filter(Boolean).length

      return fieldsSet === 1
    },
    {
      message: 'Exactly one prediction must be set (team OR player OR value)',
      path: ['teamResultId'],
    }
  )

export type UserSpecialBetInput = z.infer<typeof userSpecialBetSchema>

// Question bet schema (user-facing)
export const userQuestionBetSchema = z.object({
  leagueSpecialBetQuestionId: z
    .number()
    .int()
    .positive('Question ID is required'),
  userBet: z.boolean(),
})

export type UserQuestionBetInput = z.infer<typeof userQuestionBetSchema>

// Join league schema (user-facing)
export const joinLeagueSchema = z.object({
  leagueId: z.number().int().positive('League ID is required'),
})

// Profile update schema (shared by admin and user profile)
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  mobileNumber: z.string().max(255).optional().nullable(),
  notifyHours: z.number().int().min(0).max(1440).default(0),
  notifyChat: z.boolean().default(false),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
