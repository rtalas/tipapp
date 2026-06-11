/**
 * Utility functions for displaying user information consistently across the app
 */

interface UserInfo {
  firstName: string | null
  lastName: string | null
  username: string
}

/**
 * Get display name for a user
 * Returns "FirstName LastName" if both available, partial name if one exists, otherwise username
 */
export function getUserDisplayName(user: UserInfo): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  if (user.firstName) return user.firstName
  if (user.lastName) return user.lastName
  return user.username
}

/**
 * Get display name with username suffix for admin contexts
 * Returns "FirstName LastName (username)" or just "username"
 */
export function getUserDisplayNameWithUsername(user: UserInfo): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName} (${user.username})`
  }
  return user.username
}

interface PlayerInfo {
  firstName: string | null
  lastName: string | null
}

/**
 * Get display name for a player.
 * Returns "FirstName LastName" if both available, the single available name if
 * only one exists, otherwise the provided fallback. Avoids rendering "null".
 */
export function getPlayerDisplayName(player: PlayerInfo, fallback = ''): string {
  const { firstName, lastName } = player
  if (firstName && lastName) return `${firstName} ${lastName}`
  return firstName || lastName || fallback
}

