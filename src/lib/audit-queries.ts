import { prisma } from "./prisma";
import { EventCategory, LogSeverity } from "./audit-logger";

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
 * Get audit logs for a specific user
 * Returns logs ordered by timestamp DESC with user info
 */
export async function getUserAuditLog(
  userId: number,
  options?: AuditLogFilters
) {
  const {
    limit = 50,
    offset = 0,
    eventCategory,
    startDate,
    endDate,
  } = options || {};

  const where: any = {
    userId,
  };

  if (eventCategory) {
    where.eventCategory = eventCategory;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const logs = await prisma.auditLog.findMany({
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
  });

  return logs;
}

/**
 * Get audit logs for a specific resource
 * Returns all actions performed on a specific resource
 */
export async function getResourceAuditLog(
  resourceType: string,
  resourceId: number
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      resourceType,
      resourceId,
    },
    include: {
      User: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
  });

  return logs;
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

  const where: any = {};

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

/**
 * Get failed operations
 * Returns logs where success = false, useful for monitoring errors
 */
export async function getFailedOperations(options?: {
  limit?: number;
  severity?: LogSeverity;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { limit = 50, severity, eventType, startDate, endDate } = options || {};

  const where: any = {
    success: false,
  };

  if (severity) {
    where.severity = severity;
  }

  if (eventType) {
    where.eventType = eventType;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const logs = await prisma.auditLog.findMany({
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
    },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return logs;
}

/**
 * Get league activity report
 * Returns summary statistics for a league within a date range
 */
export async function getLeagueActivityReport(
  leagueId: number,
  startDate: Date,
  endDate: Date
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      leagueId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      eventCategory: true,
      success: true,
    },
  });

  const totalActions = logs.length;
  const userBets = logs.filter(
    (l) => l.eventCategory === EventCategory.USER_ACTION
  ).length;
  const evaluations = logs.filter(
    (l) => l.eventCategory === EventCategory.EVALUATION
  ).length;
  const errors = logs.filter((l) => !l.success).length;

  return {
    totalActions,
    userBets,
    evaluations,
    errors,
    errorRate: totalActions > 0 ? (errors / totalActions) * 100 : 0,
  };
}

/**
 * Get event type breakdown
 * Returns count of each event type for analytics
 */
export async function getEventTypeBreakdown(options?: {
  leagueId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const { leagueId, startDate, endDate } = options || {};

  const where: any = {};

  if (leagueId) {
    where.leagueId = leagueId;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const logs = await prisma.auditLog.groupBy({
    by: ["eventType"],
    where,
    _count: {
      eventType: true,
    },
    orderBy: {
      _count: {
        eventType: "desc",
      },
    },
  });

  return logs.map((log) => ({
    eventType: log.eventType,
    count: log._count.eventType,
  }));
}

/**
 * Get user activity summary
 * Returns activity stats for a specific user
 */
export async function getUserActivitySummary(
  userId: number,
  startDate?: Date,
  endDate?: Date
) {
  const where: any = {
    userId,
  };

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = startDate;
    if (endDate) where.timestamp.lte = endDate;
  }

  const [totalActions, failedActions, categories] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({ where: { ...where, success: false } }),
    prisma.auditLog.groupBy({
      by: ["eventCategory"],
      where,
      _count: {
        eventCategory: true,
      },
    }),
  ]);

  return {
    totalActions,
    failedActions,
    successRate:
      totalActions > 0
        ? ((totalActions - failedActions) / totalActions) * 100
        : 100,
    categoryBreakdown: categories.map((c) => ({
      category: c.eventCategory,
      count: c._count.eventCategory,
    })),
  };
}
