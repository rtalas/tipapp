import { auth } from '@/auth'
import { AppError } from '@/lib/error-handler'
import { AuditLogger } from '@/lib/logging/audit-logger'

/**
 * Safely parses session.user.id to an integer.
 * Throws if the value is not a valid integer, preventing NaN from propagating to DB queries.
 */
export function parseSessionUserId(id: string): number {
  const parsed = parseInt(id, 10)
  if (Number.isNaN(parsed)) {
    throw new AppError('Invalid session user ID', 'UNAUTHORIZED', 401)
  }
  return parsed
}

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
    const userId = session?.user?.id ? parseSessionUserId(session.user.id) : undefined
    await AuditLogger.adminAccessDenied(userId)
    throw new AppError('Unauthorized: Admin access required', 'UNAUTHORIZED', 403)
  }
  return session
}
