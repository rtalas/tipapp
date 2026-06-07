import { describe, it, expect } from 'vitest'
import { buildMatchBetContext } from './context-builders'
import { SPORT_IDS } from '@/lib/constants'

const baseMatch = {
  homeRegularScore: 2,
  awayRegularScore: 1,
  homeFinalScore: 2,
  awayFinalScore: 1,
  isOvertime: false,
  isShootout: false,
  isPlayoffGame: false,
  homeAdvanced: null,
}

const baseBet = {
  homeScore: 2,
  awayScore: 1,
  scorerId: null,
  noScorer: null,
  ownGoal: null,
  overtime: false,
  homeAdvanced: null,
}

describe('buildMatchBetContext - own goals', () => {
  it('excludes own-goal rows from scorerIds and sets hasOwnGoal', () => {
    const match = {
      ...baseMatch,
      MatchScorer: [
        { scorerId: 42, numberOfGoals: 1, ownGoal: false },
        { scorerId: null, numberOfGoals: 1, ownGoal: true },
      ],
    }

    const ctx = buildMatchBetContext(baseBet, match, new Map(), SPORT_IDS.FOOTBALL)

    expect(ctx.actual.scorerIds).toEqual([42])
    expect(ctx.actual.hasOwnGoal).toBe(true)
  })

  it('reports hasOwnGoal=false when no own-goal rows present', () => {
    const match = {
      ...baseMatch,
      MatchScorer: [{ scorerId: 42, numberOfGoals: 1, ownGoal: false }],
    }

    const ctx = buildMatchBetContext(baseBet, match, new Map(), SPORT_IDS.FOOTBALL)

    expect(ctx.actual.scorerIds).toEqual([42])
    expect(ctx.actual.hasOwnGoal).toBe(false)
  })

  it('passes the ownGoal prediction flag through to the context', () => {
    const match = {
      ...baseMatch,
      MatchScorer: [{ scorerId: null, numberOfGoals: 1, ownGoal: true }],
    }

    const ctx = buildMatchBetContext(
      { ...baseBet, ownGoal: true },
      match,
      new Map(),
      SPORT_IDS.FOOTBALL
    )

    expect(ctx.prediction.ownGoal).toBe(true)
  })
})
