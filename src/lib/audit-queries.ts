import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { EventCategory } from "./audit-logger";

export interface AuditLogFilters {
  limit?: number;
  offset?: number;
  eventCategory?: EventCategory;
  eventType?: string;
  leagueId?: number;
  startDate?: Date;
  endDate?: Date;
  successOnly?: boolean;
  failedOnly?: boolean;
}

/**
 * Get recent audit logs across all types
 * Supports filtering by category, league, date range, and success status
 */
export async function getRecentAuditLogs(options?: AuditLogFilters) {
  const {
    limit = 50,
    offset = 0,
    eventCategory,
    eventType,
    leagueId,
    startDate,
    endDate,
    successOnly,
    failedOnly,
  } = options || {};

  const where: Prisma.AuditLogWhereInput = {};

  if (eventCategory) {
    where.eventCategory = eventCategory;
  }

  if (eventType) {
    where.eventType = eventType;
  }

  if (leagueId) {
    where.leagueId = leagueId;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  if (successOnly) {
    where.success = true;
  } else if (failedOnly) {
    where.success = false;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        League: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    hasMore: offset + limit < total,
  };
}
