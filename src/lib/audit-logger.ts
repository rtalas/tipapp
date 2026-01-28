import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// ==================== Enums ====================

export enum EventType {
  // User betting actions
  USER_BET_CREATED = "USER_BET_CREATED",
  USER_BET_UPDATED = "USER_BET_UPDATED",
  USER_SERIES_BET_CREATED = "USER_SERIES_BET_CREATED",
  USER_SERIES_BET_UPDATED = "USER_SERIES_BET_UPDATED",
  USER_SPECIAL_BET_CREATED = "USER_SPECIAL_BET_CREATED",
  USER_SPECIAL_BET_UPDATED = "USER_SPECIAL_BET_UPDATED",
  USER_QUESTION_BET_CREATED = "USER_QUESTION_BET_CREATED",
  USER_QUESTION_BET_UPDATED = "USER_QUESTION_BET_UPDATED",

  // Authentication events
  USER_REGISTERED = "USER_REGISTERED",
  USER_LOGIN_SUCCESS = "USER_LOGIN_SUCCESS",
  USER_LOGIN_FAILED = "USER_LOGIN_FAILED",
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED",
  PASSWORD_RESET_FAILED = "PASSWORD_RESET_FAILED",

  // Evaluation operations
  MATCH_EVALUATED = "MATCH_EVALUATED",
  SERIES_EVALUATED = "SERIES_EVALUATED",
  SPECIAL_BET_EVALUATED = "SPECIAL_BET_EVALUATED",
  QUESTION_EVALUATED = "QUESTION_EVALUATED",
}

export enum EventCategory {
  USER_ACTION = "USER_ACTION",
  ADMIN_ACTION = "ADMIN_ACTION",
  AUTH = "AUTH",
  EVALUATION = "EVALUATION",
}

export enum LogSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

// ==================== Types ====================

export interface AuditLogOptions {
  eventType: EventType;
  eventCategory: EventCategory;
  severity: LogSeverity;
  userId?: number;
  sessionId?: string;
  ipAddress?: string;
  resourceType?: string;
  resourceId?: number;
  leagueId?: number;
  action?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

// ==================== Sensitive Data Sanitization ====================

const SENSITIVE_KEYS = [
  "password",
  "token",
  "api",
  "secret",
  "hash",
  "salt",
  "auth",
  "bearer",
];

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ==================== Core Logging Function ====================

export async function auditLog(options: AuditLogOptions): Promise<void> {
  try {
    const sanitizedMetadata = sanitizeMetadata(options.metadata);

    // Write to database
    await prisma.auditLog.create({
      data: {
        timestamp: new Date(),
        eventType: options.eventType,
        eventCategory: options.eventCategory,
        severity: options.severity,
        userId: options.userId,
        sessionId: options.sessionId,
        ipAddress: options.ipAddress,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        leagueId: options.leagueId,
        action: options.action,
        description: options.description,
        metadata: sanitizedMetadata as Prisma.InputJsonValue,
        durationMs: options.durationMs,
        success: options.success ?? true,
        errorCode: options.errorCode,
        errorMessage: options.errorMessage,
      },
    });

    // In production, also output structured JSON for cloud log aggregation
    if (process.env.NODE_ENV === "production") {
      console.log(
        JSON.stringify({
          type: "audit_log",
          timestamp: new Date().toISOString(),
          eventType: options.eventType,
          eventCategory: options.eventCategory,
          severity: options.severity,
          userId: options.userId,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
          leagueId: options.leagueId,
          action: options.action,
          success: options.success ?? true,
          durationMs: options.durationMs,
        })
      );
    }
  } catch (error) {
    // Logging should NEVER crash the app
    console.error("Failed to write audit log:", error);
    console.error("Audit log data:", {
      eventType: options.eventType,
      eventCategory: options.eventCategory,
      userId: options.userId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
    });
  }
}

// ==================== Convenience Functions ====================

export const AuditLogger = {
  // User betting actions
  userBetCreated: async (
    userId: number,
    leagueId: number,
    matchId: number,
    metadata?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_BET_CREATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserBet",
      resourceId: matchId,
      action: "CREATE",
      description: `User ${userId} placed bet on match ${matchId}`,
      metadata,
      durationMs,
    });
  },

  userBetUpdated: async (
    userId: number,
    leagueId: number,
    matchId: number,
    changes?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_BET_UPDATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserBet",
      resourceId: matchId,
      action: "UPDATE",
      description: `User ${userId} updated bet on match ${matchId}`,
      metadata: changes,
      durationMs,
    });
  },

  seriesBetCreated: async (
    userId: number,
    leagueId: number,
    seriesId: number,
    metadata?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_SERIES_BET_CREATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserSpecialBetSerie",
      resourceId: seriesId,
      action: "CREATE",
      description: `User ${userId} placed series bet ${seriesId}`,
      metadata,
      durationMs,
    });
  },

  seriesBetUpdated: async (
    userId: number,
    leagueId: number,
    seriesId: number,
    changes?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_SERIES_BET_UPDATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserSpecialBetSerie",
      resourceId: seriesId,
      action: "UPDATE",
      description: `User ${userId} updated series bet ${seriesId}`,
      metadata: changes,
      durationMs,
    });
  },

  specialBetCreated: async (
    userId: number,
    leagueId: number,
    specialBetId: number,
    metadata?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_SPECIAL_BET_CREATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserSpecialBetSingle",
      resourceId: specialBetId,
      action: "CREATE",
      description: `User ${userId} placed special bet ${specialBetId}`,
      metadata,
      durationMs,
    });
  },

  specialBetUpdated: async (
    userId: number,
    leagueId: number,
    specialBetId: number,
    changes?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_SPECIAL_BET_UPDATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserSpecialBetSingle",
      resourceId: specialBetId,
      action: "UPDATE",
      description: `User ${userId} updated special bet ${specialBetId}`,
      metadata: changes,
      durationMs,
    });
  },

  questionBetCreated: async (
    userId: number,
    leagueId: number,
    questionId: number,
    metadata?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_QUESTION_BET_CREATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserSpecialBetQuestion",
      resourceId: questionId,
      action: "CREATE",
      description: `User ${userId} answered question ${questionId}`,
      metadata,
      durationMs,
    });
  },

  questionBetUpdated: async (
    userId: number,
    leagueId: number,
    questionId: number,
    changes?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.USER_QUESTION_BET_UPDATED,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "UserSpecialBetQuestion",
      resourceId: questionId,
      action: "UPDATE",
      description: `User ${userId} updated question answer ${questionId}`,
      metadata: changes,
      durationMs,
    });
  },

  // Authentication events
  userRegistered: async (userId: number, username: string, email: string) => {
    await auditLog({
      eventType: EventType.USER_REGISTERED,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.INFO,
      userId,
      resourceType: "User",
      resourceId: userId,
      action: "CREATE",
      description: `New user registered: ${username}`,
      metadata: { username, email },
    });
  },

  loginSuccess: async (
    userId: number,
    username: string,
    ipAddress?: string,
    sessionId?: string
  ) => {
    await auditLog({
      eventType: EventType.USER_LOGIN_SUCCESS,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.INFO,
      userId,
      sessionId,
      ipAddress,
      resourceType: "User",
      resourceId: userId,
      action: "LOGIN",
      description: `User ${username} logged in successfully`,
      metadata: { username },
    });
  },

  loginFailed: async (
    identifier: string,
    reason: string,
    ipAddress?: string
  ) => {
    await auditLog({
      eventType: EventType.USER_LOGIN_FAILED,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.WARNING,
      ipAddress,
      action: "LOGIN",
      description: `Failed login attempt for ${identifier}`,
      metadata: { identifier, reason },
      success: false,
    });
  },

  passwordResetRequested: async (
    userId: number,
    email: string,
    tokenId?: number
  ) => {
    await auditLog({
      eventType: EventType.PASSWORD_RESET_REQUESTED,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.INFO,
      userId,
      resourceType: "PasswordResetToken",
      resourceId: tokenId,
      action: "CREATE",
      description: `Password reset requested for ${email}`,
      metadata: { email },
    });
  },

  passwordResetCompleted: async (userId: number, email: string) => {
    await auditLog({
      eventType: EventType.PASSWORD_RESET_COMPLETED,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.INFO,
      userId,
      resourceType: "User",
      resourceId: userId,
      action: "UPDATE",
      description: `Password reset completed for ${email}`,
      metadata: { email },
    });
  },

  passwordResetFailed: async (
    reason: string,
    metadata?: Record<string, unknown>
  ) => {
    await auditLog({
      eventType: EventType.PASSWORD_RESET_FAILED,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.ERROR,
      action: "UPDATE",
      description: `Password reset failed: ${reason}`,
      metadata,
      success: false,
    });
  },

  // Evaluation operations
  matchEvaluated: async (
    adminId: number,
    matchId: number,
    affectedUsers: number,
    totalPoints: number,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.MATCH_EVALUATED,
      eventCategory: EventCategory.EVALUATION,
      severity: LogSeverity.INFO,
      userId: adminId,
      resourceType: "Match",
      resourceId: matchId,
      action: "EVALUATE",
      description: `Match ${matchId} evaluated by admin ${adminId}`,
      metadata: { affectedUsers, totalPoints },
      durationMs,
    });
  },

  seriesEvaluated: async (
    adminId: number,
    seriesId: number,
    affectedUsers: number,
    totalPoints: number,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.SERIES_EVALUATED,
      eventCategory: EventCategory.EVALUATION,
      severity: LogSeverity.INFO,
      userId: adminId,
      resourceType: "LeagueSpecialBetSerie",
      resourceId: seriesId,
      action: "EVALUATE",
      description: `Series ${seriesId} evaluated by admin ${adminId}`,
      metadata: { affectedUsers, totalPoints },
      durationMs,
    });
  },

  specialBetEvaluated: async (
    adminId: number,
    specialBetId: number,
    affectedUsers: number,
    totalPoints: number,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.SPECIAL_BET_EVALUATED,
      eventCategory: EventCategory.EVALUATION,
      severity: LogSeverity.INFO,
      userId: adminId,
      resourceType: "LeagueSpecialBetSingle",
      resourceId: specialBetId,
      action: "EVALUATE",
      description: `Special bet ${specialBetId} evaluated by admin ${adminId}`,
      metadata: { affectedUsers, totalPoints },
      durationMs,
    });
  },

  questionEvaluated: async (
    adminId: number,
    questionId: number,
    affectedUsers: number,
    totalPoints: number,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: EventType.QUESTION_EVALUATED,
      eventCategory: EventCategory.EVALUATION,
      severity: LogSeverity.INFO,
      userId: adminId,
      resourceType: "LeagueSpecialBetQuestion",
      resourceId: questionId,
      action: "EVALUATE",
      description: `Question ${questionId} evaluated by admin ${adminId}`,
      metadata: { affectedUsers, totalPoints },
      durationMs,
    });
  },
};
