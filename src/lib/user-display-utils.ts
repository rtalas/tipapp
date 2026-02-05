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
 * Returns "FirstName LastName" if both available, otherwise username
 */
export function getUserDisplayName(user: UserInfo): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }
  return user.username
}

