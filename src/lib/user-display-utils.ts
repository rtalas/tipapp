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

/**
 * Get initials for a user avatar
 * Returns "FL" (first letter of first + last name) if both available,
 * otherwise first 2 letters of username
 */
export function getUserInitials(user: UserInfo): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  }
  return user.username.slice(0, 2).toUpperCase()
}
