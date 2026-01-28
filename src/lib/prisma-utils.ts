/**
 * Type-safe helper for Prisma unique constraints with nullable fields
 *
 * Prisma has a limitation where nullable fields in unique constraints
 * require an `as any` cast when comparing against `null`.
 *
 * See: https://github.com/prisma/prisma/issues/8807
 *
 * This helper encapsulates the unsafe cast in a single place with
 * proper documentation and type safety.
 *
 * @example
 * ```typescript
 * await prisma.userBet.upsert({
 *   where: {
 *     leagueMatchId_leagueUserId_deletedAt: nullableUniqueConstraint({
 *       leagueMatchId: 10,
 *       leagueUserId: 5,
 *       deletedAt: null,
 *     }),
 *   },
 *   // ... update/create
 * })
 * ```
 */
export function nullableUniqueConstraint<T extends Record<string, unknown>>(
  where: T & { deletedAt: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  // The any return type is intentional - Prisma's generated compound unique
  // constraint types don't properly handle nullable fields. This helper
  // encapsulates the unsafe cast while maintaining runtime type safety.
  // See: https://github.com/prisma/prisma/issues/8807
  return { ...where, deletedAt: null }
}
