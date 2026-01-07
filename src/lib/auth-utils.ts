import { auth } from '@/auth'

/**
 * Verifies that the current user has admin (superadmin) access.
 * Should be called at the start of any admin-only server action.
 *
 * @throws {Error} If user is not authenticated or lacks admin privileges
 * @returns {Promise<Session>} The authenticated admin session
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isSuperadmin) {
    throw new Error('Unauthorized: Admin access required')
  }
  return session
}
