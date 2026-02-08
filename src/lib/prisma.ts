/**
 * Prisma Client Singleton
 *
 * Provides a singleton instance of the Prisma Client to prevent multiple instances
 * during hot-reloading in development. This is the recommended pattern for Next.js.
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma'
 *
 * const users = await prisma.user.findMany()
 * ```
 *
 * @see https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 * @module prisma
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Singleton Prisma client instance
 * Configured with minimal logging in production (errors only)
 * and additional warn logging in development
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: appendConnectionLimit(process.env.DATABASE_URL || ""),
      },
    },
  });

/**
 * Append connection_limit to DATABASE_URL if not already set.
 * Keeps each serverless instance's pool small to avoid exhausting
 * Supabase PgBouncer connections across concurrent instances.
 */
function appendConnectionLimit(url: string): string {
  if (!url || url.includes("connection_limit")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=5`;
}

// Preserve client across hot-reloads in development
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
