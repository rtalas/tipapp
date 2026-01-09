/**
 * Utility functions for delete operations
 * Provides consistent error messaging across the application
 */

/**
 * Builds a standardized error message for deletion failures due to usage
 * @param itemName - The type of item being deleted (e.g., "series type", "special bet type")
 * @param usageCount - Number of times the item is being used
 * @param singularNoun - The singular form of what it's used in (default: "league")
 * @returns Formatted error message
 *
 * @example
 * buildDeletionErrorMessage("series type", 3)
 * // Returns: "Cannot delete: This series type is used in 3 leagues"
 *
 * @example
 * buildDeletionErrorMessage("player", 2, "team")
 * // Returns: "Cannot delete: This player is used in 2 teams"
 */
export function buildDeletionErrorMessage(
  itemName: string,
  usageCount: number,
  singularNoun: string = 'league'
): string {
  const pluralNoun = usageCount !== 1 ? `${singularNoun}s` : singularNoun
  return `Cannot delete: This ${itemName} is used in ${usageCount} ${pluralNoun}`
}
