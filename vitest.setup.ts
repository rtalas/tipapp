import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set required environment variables for tests
process.env.APP_URL = 'http://localhost:3000';
process.env.APP_NAME = 'TipApp';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'testpass';
process.env.SMTP_FROM = 'noreply@test.com';
process.env.RESEND_API_KEY = 'test-resend-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.AUTH_SECRET = 'test-auth-secret-for-testing';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Auth.js
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn: Function) => fn),
}));

// Mock Prisma globally — covers all models used across tests
vi.mock('@/lib/prisma', () => {
  const createModelMock = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirstOrThrow: vi.fn(),
    upsert: vi.fn(),
  });

  return {
    prisma: {
      user: createModelMock(),
      passwordResetToken: createModelMock(),
      leaguePrize: createModelMock(),
      leagueMatch: createModelMock(),
      userBet: createModelMock(),
      leaguePlayer: createModelMock(),
      leagueUser: createModelMock(),
      topScorerRankingVersion: createModelMock(),
      auditLog: createModelMock(),
      league: createModelMock(),
      leagueSpecialBetQuestion: createModelMock(),
      userSpecialBetQuestion: createModelMock(),
      $transaction: vi.fn(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    },
  };
});

// Mock audit-logger globally to prevent "Cannot read properties of undefined" errors
vi.mock('@/lib/logging/audit-logger', () => {
  const noOp = vi.fn().mockResolvedValue(undefined);
  return {
    auditLog: noOp,
    AuditLogger: {
      userBetCreated: vi.fn().mockResolvedValue(undefined),
      userBetUpdated: vi.fn().mockResolvedValue(undefined),
      seriesBetCreated: vi.fn().mockResolvedValue(undefined),
      seriesBetUpdated: vi.fn().mockResolvedValue(undefined),
      specialBetCreated: vi.fn().mockResolvedValue(undefined),
      specialBetUpdated: vi.fn().mockResolvedValue(undefined),
      questionBetCreated: vi.fn().mockResolvedValue(undefined),
      questionBetUpdated: vi.fn().mockResolvedValue(undefined),
      userRegistered: vi.fn().mockResolvedValue(undefined),
      loginSuccess: vi.fn().mockResolvedValue(undefined),
      loginFailed: vi.fn().mockResolvedValue(undefined),
      passwordResetRequested: vi.fn().mockResolvedValue(undefined),
      passwordResetCompleted: vi.fn().mockResolvedValue(undefined),
      passwordResetFailed: vi.fn().mockResolvedValue(undefined),
      matchEvaluated: vi.fn().mockResolvedValue(undefined),
      seriesEvaluated: vi.fn().mockResolvedValue(undefined),
      specialBetEvaluated: vi.fn().mockResolvedValue(undefined),
      questionEvaluated: vi.fn().mockResolvedValue(undefined),
    },
    EventType: {},
    EventCategory: {},
    LogSeverity: {},
  };
});
