/**
 * Special Bet Type Utilities
 *
 * Centralized utilities for working with special bet types and their IDs.
 * Database Type IDs: 1=Player, 2=Team, 3=Exact Value, 4=Closest Value
 */

export const SPECIAL_BET_TYPE_IDS = {
  PLAYER: 1,
  TEAM: 2,
  EXACT_VALUE: 3,
  CLOSEST_VALUE: 4,
} as const

export type SpecialBetType = 'team' | 'player' | 'value'

/**
 * Determines the prediction type based on special bet type ID
 * @param typeId - The SpecialBetSingleType.id from the database
 * @returns The prediction type category
 */
export function getSpecialBetType(typeId: number): SpecialBetType {
  if (typeId === SPECIAL_BET_TYPE_IDS.TEAM) return 'team'
  if (typeId === SPECIAL_BET_TYPE_IDS.PLAYER) return 'player'
  return 'value'
}

/**
 * Type guard: Check if bet type is team-based
 */
export function isTeamBet(typeId: number): boolean {
  return typeId === SPECIAL_BET_TYPE_IDS.TEAM
}

/**
 * Type guard: Check if bet type is player-based
 */
export function isPlayerBet(typeId: number): boolean {
  return typeId === SPECIAL_BET_TYPE_IDS.PLAYER
}

/**
 * Type guard: Check if bet type is value-based (exact or closest)
 */
export function isValueBet(typeId: number): boolean {
  return typeId === SPECIAL_BET_TYPE_IDS.EXACT_VALUE || typeId === SPECIAL_BET_TYPE_IDS.CLOSEST_VALUE
}

/**
 * Type guard: Check if bet type is exact value
 */
export function isExactValueBet(typeId: number): boolean {
  return typeId === SPECIAL_BET_TYPE_IDS.EXACT_VALUE
}

/**
 * Type guard: Check if bet type is closest value
 */
export function isClosestValueBet(typeId: number): boolean {
  return typeId === SPECIAL_BET_TYPE_IDS.CLOSEST_VALUE
}
