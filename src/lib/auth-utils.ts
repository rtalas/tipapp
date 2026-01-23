import { auth } from '@/auth'
import { AppError } from '@/lib/error-handler'

/**
 * Verifies that the current user has admin (superadmin) access.
 * Should be called at the start of any admin-only server action.
 *
 * @throws {AppError} If user is not authenticated or lacks admin privileges
 * @returns {Promise<Session>} The authenticated admin session
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isSuperadmin) {
    throw new AppError('Unauthorized: Admin access required', 'UNAUTHORIZED', 403)
  }
  return session
}
