/**
 * Special Bet Type Utilities
 *
 * Centralized utilities for working with special bet types and their IDs.
 * Database Type IDs: 1=Player, 2=Team, 3=Exact Value, 4=Closest Value
 */

const SPECIAL_BET_TYPE_IDS = {
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