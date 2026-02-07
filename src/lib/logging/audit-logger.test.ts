import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";

// Use real audit-logger (overrides global mock) since we're testing it
vi.unmock("@/lib/logging/audit-logger");

import {
  auditLog,
  AuditLogger,
  EventType,
  EventCategory,
  LogSeverity,
} from "./audit-logger";

describe("audit-logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console methods
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  describe("auditLog()", () => {
    it("should create database entry with correct fields", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({
        id: 1,
        timestamp: new Date(),
        eventType: EventType.USER_BET_CREATED,
        eventCategory: EventCategory.USER_ACTION,
        severity: LogSeverity.INFO,
        userId: 123,
        sessionId: null,
        ipAddress: null,
        resourceType: "UserBet",
        resourceId: 456,
        leagueId: 789,
        action: "CREATE",
        description: "Test bet created",
        metadata: { homeScore: 2, awayScore: 1 },
        durationMs: 50,
        success: true,
        errorCode: null,
        errorMessage: null,
      });

      await auditLog({
        eventType: EventType.USER_BET_CREATED,
        eventCategory: EventCategory.USER_ACTION,
        severity: LogSeverity.INFO,
        userId: 123,
        resourceType: "UserBet",
        resourceId: 456,
        leagueId: 789,
        action: "CREATE",
        description: "Test bet created",
        metadata: { homeScore: 2, awayScore: 1 },
        durationMs: 50,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: EventType.USER_BET_CREATED,
          eventCategory: EventCategory.USER_ACTION,
          severity: LogSeverity.INFO,
          userId: 123,
          resourceType: "UserBet",
          resourceId: 456,
          leagueId: 789,
          action: "CREATE",
          description: "Test bet created",
          metadata: { homeScore: 2, awayScore: 1 },
          durationMs: 50,
          success: true,
        }),
      });
    });

    it("should sanitize sensitive data from metadata - password", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_REGISTERED,
        eventCategory: EventCategory.AUTH,
        severity: LogSeverity.INFO,
        metadata: {
          username: "testuser",
          password: "SecretPass123",
          email: "test@example.com",
        },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            username: "testuser",
            password: "[REDACTED]",
            email: "test@example.com",
          },
        }),
      });
    });

    it("should sanitize sensitive data from metadata - token", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.PASSWORD_RESET_REQUESTED,
        eventCategory: EventCategory.AUTH,
        severity: LogSeverity.INFO,
        metadata: {
          email: "test@example.com",
          resetToken: "abc123def456",
        },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            email: "test@example.com",
            resetToken: "[REDACTED]",
          },
        }),
      });
    });

    it("should sanitize sensitive data from nested metadata", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_LOGIN_SUCCESS,
        eventCategory: EventCategory.AUTH,
        severity: LogSeverity.INFO,
        metadata: {
          user: {
            username: "testuser",
            hashedPassword: "hashed123",
            email: "test@example.com",
          },
          session: {
            id: "session123",
            token: "session-token-abc",
          },
        },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            user: {
              username: "testuser",
              hashedPassword: "[REDACTED]",
              email: "test@example.com",
            },
            session: {
              id: "session123",
              token: "[REDACTED]",
            },
          },
        }),
      });
    });

    it("should sanitize case-insensitive sensitive keys", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_LOGIN_SUCCESS,
        eventCategory: EventCategory.AUTH,
        severity: LogSeverity.INFO,
        metadata: {
          username: "testuser",
          Password: "SecretPass123",
          API_KEY: "key123",
          MySecret: "secret123",
        },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            username: "testuser",
            Password: "[REDACTED]",
            API_KEY: "[REDACTED]",
            MySecret: "[REDACTED]",
          },
        }),
      });
    });

    it("should handle undefined metadata", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_BET_CREATED,
        eventCategory: EventCategory.USER_ACTION,
        severity: LogSeverity.INFO,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: undefined,
        }),
      });
    });

    it("should default success to true if not provided", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_BET_CREATED,
        eventCategory: EventCategory.USER_ACTION,
        severity: LogSeverity.INFO,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: true,
        }),
      });
    });

    it("should handle success: false for failed operations", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_LOGIN_FAILED,
        eventCategory: EventCategory.AUTH,
        severity: LogSeverity.WARNING,
        success: false,
        errorCode: "INVALID_CREDENTIALS",
        errorMessage: "Invalid username or password",
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          errorCode: "INVALID_CREDENTIALS",
          errorMessage: "Invalid username or password",
        }),
      });
    });

    it("should not crash app if database write fails", async () => {
      vi.mocked(prisma.auditLog.create).mockRejectedValue(
        new Error("Database connection failed")
      );

      // Should not throw
      await expect(
        auditLog({
          eventType: EventType.USER_BET_CREATED,
          eventCategory: EventCategory.USER_ACTION,
          severity: LogSeverity.INFO,
        })
      ).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        "Failed to write audit log:",
        expect.any(Error)
      );
    });

    it("should log to console in production mode", async () => {
      process.env.NODE_ENV = "production";
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_BET_CREATED,
        eventCategory: EventCategory.USER_ACTION,
        severity: LogSeverity.INFO,
        userId: 123,
        resourceType: "UserBet",
        resourceId: 456,
        leagueId: 789,
        action: "CREATE",
        durationMs: 50,
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"type":"audit_log"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"USER_BET_CREATED"')
      );
    });

    it("should not log to console in development mode", async () => {
      process.env.NODE_ENV = "development";
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      await auditLog({
        eventType: EventType.USER_BET_CREATED,
        eventCategory: EventCategory.USER_ACTION,
        severity: LogSeverity.INFO,
      });

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("AuditLogger convenience functions", () => {
    beforeEach(() => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);
    });

    describe("userBetCreated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.userBetCreated(
          123,
          789,
          456,
          { homeScore: 2, awayScore: 1 },
          50
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_BET_CREATED,
            eventCategory: EventCategory.USER_ACTION,
            severity: LogSeverity.INFO,
            userId: 123,
            leagueId: 789,
            resourceType: "UserBet",
            resourceId: 456,
            action: "CREATE",
            description: "User 123 placed bet on match 456",
            metadata: { homeScore: 2, awayScore: 1 },
            durationMs: 50,
          }),
        });
      });
    });

    describe("userBetUpdated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.userBetUpdated(
          123,
          789,
          456,
          { homeScore: { old: 2, new: 3 } },
          50
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_BET_UPDATED,
            eventCategory: EventCategory.USER_ACTION,
            severity: LogSeverity.INFO,
            userId: 123,
            leagueId: 789,
            resourceType: "UserBet",
            resourceId: 456,
            action: "UPDATE",
            metadata: { homeScore: { old: 2, new: 3 } },
          }),
        });
      });
    });

    describe("userRegistered()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.userRegistered(123, "testuser", "test@example.com");

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_REGISTERED,
            eventCategory: EventCategory.AUTH,
            severity: LogSeverity.INFO,
            userId: 123,
            resourceType: "User",
            resourceId: 123,
            action: "CREATE",
            description: "New user registered: testuser",
            metadata: { username: "testuser", email: "test@example.com" },
          }),
        });
      });
    });

    describe("loginSuccess()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.loginSuccess(
          123,
          "testuser",
          "192.168.1.1",
          "session123"
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_LOGIN_SUCCESS,
            eventCategory: EventCategory.AUTH,
            severity: LogSeverity.INFO,
            userId: 123,
            sessionId: "session123",
            ipAddress: "192.168.1.1",
            resourceType: "User",
            resourceId: 123,
            action: "LOGIN",
            description: "User testuser logged in successfully",
            metadata: { username: "testuser" },
          }),
        });
      });
    });

    describe("loginFailed()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.loginFailed(
          "testuser",
          "Invalid credentials",
          "192.168.1.1"
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_LOGIN_FAILED,
            eventCategory: EventCategory.AUTH,
            severity: LogSeverity.WARNING,
            ipAddress: "192.168.1.1",
            action: "LOGIN",
            description: "Failed login attempt for testuser",
            metadata: { identifier: "testuser", reason: "Invalid credentials" },
            success: false,
          }),
        });
      });
    });

    describe("matchEvaluated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.matchEvaluated(1, 456, 15, 120, 250);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.MATCH_EVALUATED,
            eventCategory: EventCategory.EVALUATION,
            severity: LogSeverity.INFO,
            userId: 1,
            resourceType: "Match",
            resourceId: 456,
            action: "EVALUATE",
            description: "Match 456 evaluated by admin 1",
            metadata: { affectedUsers: 15, totalPoints: 120 },
            durationMs: 250,
          }),
        });
      });
    });

    describe("seriesBetCreated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.seriesBetCreated(
          123,
          789,
          456,
          { homeTeamScore: 4, awayTeamScore: 3 },
          50
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_SERIES_BET_CREATED,
            eventCategory: EventCategory.USER_ACTION,
            severity: LogSeverity.INFO,
            userId: 123,
            leagueId: 789,
            resourceType: "UserSpecialBetSerie",
            resourceId: 456,
            action: "CREATE",
            metadata: { homeTeamScore: 4, awayTeamScore: 3 },
          }),
        });
      });
    });

    describe("specialBetCreated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.specialBetCreated(
          123,
          789,
          456,
          { teamResultId: 10 },
          50
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_SPECIAL_BET_CREATED,
            eventCategory: EventCategory.USER_ACTION,
            severity: LogSeverity.INFO,
            userId: 123,
            leagueId: 789,
            resourceType: "UserSpecialBetSingle",
            resourceId: 456,
            action: "CREATE",
            metadata: { teamResultId: 10 },
          }),
        });
      });
    });

    describe("questionBetCreated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.questionBetCreated(
          123,
          789,
          456,
          { userBet: true },
          50
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.USER_QUESTION_BET_CREATED,
            eventCategory: EventCategory.USER_ACTION,
            severity: LogSeverity.INFO,
            userId: 123,
            leagueId: 789,
            resourceType: "UserSpecialBetQuestion",
            resourceId: 456,
            action: "CREATE",
            metadata: { userBet: true },
          }),
        });
      });
    });

    describe("passwordResetRequested()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.passwordResetRequested(
          123,
          "test@example.com",
          999
        );

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.PASSWORD_RESET_REQUESTED,
            eventCategory: EventCategory.AUTH,
            severity: LogSeverity.INFO,
            userId: 123,
            resourceType: "PasswordResetToken",
            resourceId: 999,
            action: "CREATE",
            description: "Password reset requested for test@example.com",
            metadata: { email: "test@example.com" },
          }),
        });
      });
    });

    describe("passwordResetCompleted()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.passwordResetCompleted(123, "test@example.com");

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.PASSWORD_RESET_COMPLETED,
            eventCategory: EventCategory.AUTH,
            severity: LogSeverity.INFO,
            userId: 123,
            resourceType: "User",
            resourceId: 123,
            action: "UPDATE",
            description: "Password reset completed for test@example.com",
            metadata: { email: "test@example.com" },
          }),
        });
      });
    });

    describe("seriesEvaluated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.seriesEvaluated(1, 456, 15, 120, 250);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.SERIES_EVALUATED,
            eventCategory: EventCategory.EVALUATION,
            severity: LogSeverity.INFO,
            userId: 1,
            resourceType: "LeagueSpecialBetSerie",
            resourceId: 456,
            action: "EVALUATE",
            metadata: { affectedUsers: 15, totalPoints: 120 },
            durationMs: 250,
          }),
        });
      });
    });

    describe("specialBetEvaluated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.specialBetEvaluated(1, 456, 15, 120, 250);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.SPECIAL_BET_EVALUATED,
            eventCategory: EventCategory.EVALUATION,
            severity: LogSeverity.INFO,
            userId: 1,
            resourceType: "LeagueSpecialBetSingle",
            resourceId: 456,
            action: "EVALUATE",
            metadata: { affectedUsers: 15, totalPoints: 120 },
            durationMs: 250,
          }),
        });
      });
    });

    describe("questionEvaluated()", () => {
      it("should call auditLog with correct parameters", async () => {
        await AuditLogger.questionEvaluated(1, 456, 15, 120, 250);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType: EventType.QUESTION_EVALUATED,
            eventCategory: EventCategory.EVALUATION,
            severity: LogSeverity.INFO,
            userId: 1,
            resourceType: "LeagueSpecialBetQuestion",
            resourceId: 456,
            action: "EVALUATE",
            metadata: { affectedUsers: 15, totalPoints: 120 },
            durationMs: 250,
          }),
        });
      });
    });
  });
});
