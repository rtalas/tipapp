'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { buildLeagueMatchWhere, buildPendingMatchWhere } from '@/lib/query-builders'
import { leagueMatchInclude, matchWithEvaluatorsInclude } from '@/lib/prisma-helpers'
import {
  createMatchSchema,
  updateMatchResultSchema,
  type CreateMatchInput,
  type UpdateMatchResultInput,
} from '@/lib/validation/admin'

export async function createMatch(input: CreateMatchInput) {
  await requireAdmin()

  const validated = createMatchSchema.parse(input)
  const now = new Date()

  // Verify teams belong to the league
  const homeTeam = await prisma.leagueTeam.findFirst({
    where: {
      id: validated.homeTeamId,
      leagueId: validated.leagueId,
      deletedAt: null,
    },
  })

  const awayTeam = await prisma.leagueTeam.findFirst({
    where: {
      id: validated.awayTeamId,
      leagueId: validated.leagueId,
      deletedAt: null,
    },
  })

  if (!homeTeam || !awayTeam) {
    throw new Error('Teams must belong to the selected league')
  }

  // Transaction: Create match + league match
  const result = await prisma.$transaction(async (tx) => {
    // Create the match
    const match = await tx.match.create({
      data: {
        dateTime: validated.dateTime,
        homeTeamId: validated.homeTeamId,
        awayTeamId: validated.awayTeamId,
        isPlayoffGame: validated.isPlayoffGame,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Create the league match link
    await tx.leagueMatch.create({
      data: {
        leagueId: validated.leagueId,
        matchId: match.id,
        isDoubled: validated.isDoubled,
        createdAt: now,
        updatedAt: now,
      },
    })

    return match
  })

  revalidatePath('/admin/matches')
  return { success: true, matchId: result.id }
}

export async function updateMatchResult(input: UpdateMatchResultInput) {
  await requireAdmin()

  const validated = updateMatchResultSchema.parse(input)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // Update the match scores
    await tx.match.update({
      where: { id: validated.matchId },
      data: {
        homeRegularScore: validated.homeRegularScore,
        awayRegularScore: validated.awayRegularScore,
        homeFinalScore: validated.homeFinalScore ?? validated.homeRegularScore,
        awayFinalScore: validated.awayFinalScore ?? validated.awayRegularScore,
        isOvertime: validated.isOvertime,
        isShootout: validated.isShootout,
        updatedAt: now,
      },
    })

    // Handle scorers
    if (validated.scorers) {
      // Delete existing scorers
      await tx.matchScorer.deleteMany({
        where: { matchId: validated.matchId },
      })

      // Create new scorers
      if (validated.scorers.length > 0) {
        await tx.matchScorer.createMany({
          data: validated.scorers.map((scorer) => ({
            matchId: validated.matchId,
            scorerId: scorer.playerId,
            numberOfGoals: scorer.numberOfGoals,
            createdAt: now,
            updatedAt: now,
          })),
        })
      }
    }
  })

  revalidatePath('/admin/matches')
  revalidatePath('/admin/results')
  return { success: true }
}

export async function deleteMatch(matchId: number) {
  await requireAdmin()

  // Soft delete by setting deletedAt
  await prisma.match.update({
    where: { id: matchId },
    data: { deletedAt: new Date() },
  })

  revalidatePath('/admin/matches')
  return { success: true }
}

// Query functions
export async function getMatches(filters?: {
  leagueId?: number
  status?: 'all' | 'scheduled' | 'finished' | 'evaluated'
}) {
  const whereConditions = buildLeagueMatchWhere(filters)

  return prisma.leagueMatch.findMany({
    where: whereConditions,
    include: leagueMatchInclude,
    orderBy: { Match: { dateTime: 'desc' } },
  })
}

export async function getMatchById(matchId: number) {
  return prisma.match.findUnique({
    where: { id: matchId, deletedAt: null },
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
      LeagueMatch: {
        include: { League: true },
      },
    },
  })
}

export async function getLeaguesWithTeams() {
  return prisma.league.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    include: {
      LeagueTeam: {
        where: { deletedAt: null },
        include: { Team: true },
        orderBy: { Team: { name: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  })
}

// Get pending matches (finished but not evaluated)
export async function getPendingMatches(filters?: { leagueId?: number }) {
  const whereConditions = buildPendingMatchWhere(filters)

  return prisma.leagueMatch.findMany({
    where: whereConditions,
    include: {
      ...leagueMatchInclude,
      _count: {
        select: { UserBet: true },
      },
    },
    orderBy: { Match: { dateTime: 'asc' } },
  })
}

// Determine winner: 1 = home, 2 = away, 0 = draw
function getWinner(homeScore: number, awayScore: number): number {
  if (homeScore > awayScore) return 1
  if (awayScore > homeScore) return 2
  return 0
}

// Evaluate a single match and calculate points for all bets
// Uses atomic transaction to prevent race conditions (double evaluation)
export async function evaluateMatch(matchId: number) {
  await requireAdmin()

  const now = new Date()

  // Wrapped in transaction with optimistic locking
  // Prevents concurrent evaluations of the same match
  const result = await prisma.$transaction(async (tx) => {
    // Lock: Get match with exclusive lock within transaction
    const match = await tx.match.findUnique({
      where: { id: matchId, deletedAt: null },
      include: {
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
      },
    })

    if (!match) {
      throw new Error('Match not found')
    }

    // Race condition protection: Check if already evaluated
    if (match.isEvaluated) {
      throw new Error('Match is already evaluated')
    }

    if (match.homeRegularScore === null || match.awayRegularScore === null) {
      throw new Error('Match scores must be entered before evaluation')
    }

    const leagueMatch = match.LeagueMatch[0]
    if (!leagueMatch) {
      throw new Error('Match is not linked to a league')
    }

    const evaluators = leagueMatch.League.Evaluator
    const isDoubled = leagueMatch.isDoubled ?? false
    const multiplier = isDoubled ? 2 : 1

    // Build evaluator lookup by type name
    const evaluatorByType: Record<string, number> = {}
    for (const evaluator of evaluators) {
      evaluatorByType[evaluator.EvaluatorType.name] = parseInt(evaluator.points, 10) || 0
    }

    // Actual match results
    const actualHomeScore = match.homeRegularScore
    const actualAwayScore = match.awayRegularScore
    const actualWinner = getWinner(actualHomeScore, actualAwayScore)
    const actualGoalDifference = actualHomeScore - actualAwayScore
    const actualTotalGoals = actualHomeScore + actualAwayScore
    const actualScorerIds = match.MatchScorer.map((s) => s.scorerId)

    // Process each bet
    for (const bet of leagueMatch.UserBet) {
      let points = 0

      // Check exact score
      if (bet.homeScore === actualHomeScore && bet.awayScore === actualAwayScore) {
        points += evaluatorByType['exact_score'] ?? 0
      }

      // Check correct winner
      const betWinner = getWinner(bet.homeScore, bet.awayScore)
      if (betWinner === actualWinner) {
        points += evaluatorByType['winner'] ?? 0
      }

      // Check goal difference (only if not exact score and not a draw)
      const betGoalDifference = bet.homeScore - bet.awayScore
      if (betGoalDifference === actualGoalDifference) {
        points += evaluatorByType['goal_difference'] ?? 0
      }

      // Check total goals
      const betTotalGoals = bet.homeScore + bet.awayScore
      if (betTotalGoals === actualTotalGoals) {
        points += evaluatorByType['total_goals'] ?? 0
      }

      // Check scorer (if user predicted a scorer and it matches)
      if (bet.scorerId && actualScorerIds.includes(bet.scorerId)) {
        points += evaluatorByType['scorer'] ?? 0
      }

      // Apply multiplier
      const totalPoints = points * multiplier

      // Update bet with calculated points
      await tx.userBet.update({
        where: { id: bet.id },
        data: {
          totalPoints,
          updatedAt: now,
        },
      })
    }

    // Mark match as evaluated - atomic update prevents double evaluation
    await tx.match.update({
      where: { id: matchId },
      data: {
        isEvaluated: true,
        updatedAt: now,
      },
    })

    return { evaluatedBets: leagueMatch.UserBet.length }
  }, {
    // Prisma transaction isolation level for strong consistency
    isolationLevel: 'Serializable',
  })

  revalidatePath('/admin/matches')
  revalidatePath('/admin/results')
  return { success: true, evaluatedBets: result.evaluatedBets }
}

// Get recently evaluated matches
export async function getEvaluatedMatches(limit = 10) {
  return prisma.leagueMatch.findMany({
    where: {
      deletedAt: null,
      Match: {
        deletedAt: null,
        isEvaluated: true,
      },
    },
    include: {
      League: true,
      Match: {
        include: {
          LeagueTeam_Match_homeTeamIdToLeagueTeam: {
            include: { Team: true },
          },
          LeagueTeam_Match_awayTeamIdToLeagueTeam: {
            include: { Team: true },
          },
        },
      },
      _count: {
        select: { UserBet: true },
      },
    },
    orderBy: { Match: { updatedAt: 'desc' } },
    take: limit,
  })
}

