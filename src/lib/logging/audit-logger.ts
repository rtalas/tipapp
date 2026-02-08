import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

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
  ADMIN_ACCESS_DENIED = "ADMIN_ACCESS_DENIED",
  LEAGUE_ACCESS_DENIED = "LEAGUE_ACCESS_DENIED",

  // Chat operations
  CHAT_MESSAGE_SENT = "CHAT_MESSAGE_SENT",
  CHAT_MESSAGE_DELETED = "CHAT_MESSAGE_DELETED",

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

const MAX_SANITIZE_DEPTH = 5;

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
  depth: number = 0,
  seen: WeakSet<object> = new WeakSet()
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  if (depth >= MAX_SANITIZE_DEPTH) return { _truncated: true };
  if (seen.has(metadata)) return { _circular: true };
  seen.add(metadata);

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      lowerKey.includes(sensitiveKey)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(
        value as Record<string, unknown>,
        depth + 1,
        seen
      );
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

// ==================== Factories ====================

function createBetLoggers(config: {
  createdEvent: EventType;
  updatedEvent: EventType;
  resourceType: string;
  createdDesc: string;
  updatedDesc: string;
}) {
  const created = async (
    userId: number,
    leagueId: number,
    resourceId: number,
    metadata?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: config.createdEvent,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: config.resourceType,
      resourceId,
      action: "CREATE",
      description: `User ${userId} ${config.createdDesc} ${resourceId}`,
      metadata,
      durationMs,
    });
  };

  const updated = async (
    userId: number,
    leagueId: number,
    resourceId: number,
    changes?: Record<string, unknown>,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: config.updatedEvent,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: config.resourceType,
      resourceId,
      action: "UPDATE",
      description: `User ${userId} ${config.updatedDesc} ${resourceId}`,
      metadata: changes,
      durationMs,
    });
  };

  return { created, updated };
}

function createEvalLogger(config: {
  eventType: EventType;
  resourceType: string;
  label: string;
}) {
  return async (
    adminId: number,
    resourceId: number,
    affectedUsers: number,
    totalPoints: number,
    durationMs?: number
  ) => {
    await auditLog({
      eventType: config.eventType,
      eventCategory: EventCategory.EVALUATION,
      severity: LogSeverity.INFO,
      userId: adminId,
      resourceType: config.resourceType,
      resourceId,
      action: "EVALUATE",
      description: `${config.label} ${resourceId} evaluated by admin ${adminId}`,
      metadata: { affectedUsers, totalPoints },
      durationMs,
    });
  };
}

// ==================== Generated Loggers ====================

const matchBet = createBetLoggers({
  createdEvent: EventType.USER_BET_CREATED,
  updatedEvent: EventType.USER_BET_UPDATED,
  resourceType: "UserBet",
  createdDesc: "placed bet on match",
  updatedDesc: "updated bet on match",
});

const seriesBet = createBetLoggers({
  createdEvent: EventType.USER_SERIES_BET_CREATED,
  updatedEvent: EventType.USER_SERIES_BET_UPDATED,
  resourceType: "UserSpecialBetSerie",
  createdDesc: "placed series bet",
  updatedDesc: "updated series bet",
});

const specialBet = createBetLoggers({
  createdEvent: EventType.USER_SPECIAL_BET_CREATED,
  updatedEvent: EventType.USER_SPECIAL_BET_UPDATED,
  resourceType: "UserSpecialBetSingle",
  createdDesc: "placed special bet",
  updatedDesc: "updated special bet",
});

const questionBet = createBetLoggers({
  createdEvent: EventType.USER_QUESTION_BET_CREATED,
  updatedEvent: EventType.USER_QUESTION_BET_UPDATED,
  resourceType: "UserSpecialBetQuestion",
  createdDesc: "answered question",
  updatedDesc: "updated question answer",
});

// ==================== Convenience Functions ====================

export const AuditLogger = {
  // User betting actions (factory-generated)
  userBetCreated: matchBet.created,
  userBetUpdated: matchBet.updated,
  seriesBetCreated: seriesBet.created,
  seriesBetUpdated: seriesBet.updated,
  specialBetCreated: specialBet.created,
  specialBetUpdated: specialBet.updated,
  questionBetCreated: questionBet.created,
  questionBetUpdated: questionBet.updated,

  // Authentication events (unique signatures)
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

  adminAccessDenied: async (userId?: number) => {
    await auditLog({
      eventType: EventType.ADMIN_ACCESS_DENIED,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.WARNING,
      userId,
      action: "ACCESS",
      description: userId
        ? `User ${userId} attempted admin access without privileges`
        : "Unauthenticated admin access attempt",
      success: false,
    });
  },

  leagueAccessDenied: async (userId: number, leagueId: number) => {
    await auditLog({
      eventType: EventType.LEAGUE_ACCESS_DENIED,
      eventCategory: EventCategory.AUTH,
      severity: LogSeverity.WARNING,
      userId,
      leagueId,
      action: "ACCESS",
      description: `User ${userId} attempted access to league ${leagueId} without membership`,
      success: false,
    });
  },

  // Chat operations
  chatMessageSent: async (userId: number, leagueId: number, messageId: number) => {
    await auditLog({
      eventType: EventType.CHAT_MESSAGE_SENT,
      eventCategory: EventCategory.USER_ACTION,
      severity: LogSeverity.INFO,
      userId,
      leagueId,
      resourceType: "Message",
      resourceId: messageId,
      action: "CREATE",
      description: `User ${userId} sent message ${messageId} in league ${leagueId}`,
    });
  },

  chatMessageDeleted: async (
    userId: number,
    leagueId: number,
    messageId: number,
    isOwnMessage: boolean
  ) => {
    await auditLog({
      eventType: EventType.CHAT_MESSAGE_DELETED,
      eventCategory: EventCategory.USER_ACTION,
      severity: isOwnMessage ? LogSeverity.INFO : LogSeverity.WARNING,
      userId,
      leagueId,
      resourceType: "Message",
      resourceId: messageId,
      action: "DELETE",
      description: isOwnMessage
        ? `User ${userId} deleted own message ${messageId}`
        : `User ${userId} deleted another user's message ${messageId} (moderator action)`,
      metadata: { isOwnMessage },
    });
  },

  // Evaluation operations (factory-generated)
  matchEvaluated: createEvalLogger({
    eventType: EventType.MATCH_EVALUATED,
    resourceType: "Match",
    label: "Match",
  }),

  seriesEvaluated: createEvalLogger({
    eventType: EventType.SERIES_EVALUATED,
    resourceType: "LeagueSpecialBetSerie",
    label: "Series",
  }),

  specialBetEvaluated: createEvalLogger({
    eventType: EventType.SPECIAL_BET_EVALUATED,
    resourceType: "LeagueSpecialBetSingle",
    label: "Special bet",
  }),

  questionEvaluated: createEvalLogger({
    eventType: EventType.QUESTION_EVALUATED,
    resourceType: "LeagueSpecialBetQuestion",
    label: "Question",
  }),
};
