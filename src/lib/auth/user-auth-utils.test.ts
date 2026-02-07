import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireLeagueMember, getMostActiveLeagueId, isBettingOpen } from './user-auth-utils'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/error-handler'

const mockAuth = vi.mocked(auth)
const mockPrisma = vi.mocked(prisma, true)

const authenticatedSession = {
  user: { id: '5', username: 'player1', isSuperadmin: false },
  expires: '2026-12-31',
}

const leagueUserRecord = {
  id: 100,
  leagueId: 1,
  userId: 5,
  admin: false,
  active: true,
  paid: true,
}

describe('requireLeagueMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return session, leagueUser and userId for active member', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    mockPrisma.leagueUser.findFirst.mockResolvedValue(leagueUserRecord as any)

    const result = await requireLeagueMember(1)

    expect(result.session).toBe(authenticatedSession)
    expect(result.leagueUser).toBe(leagueUserRecord)
    expect(result.userId).toBe(5)
  })

  it('should query with correct filters', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    mockPrisma.leagueUser.findFirst.mockResolvedValue(leagueUserRecord as any)

    await requireLeagueMember(42)

    expect(mockPrisma.leagueUser.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 5,
        leagueId: 42,
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        leagueId: true,
        userId: true,
        admin: true,
        active: true,
        paid: true,
      },
    })
  })

  it('should throw AppError when session is null (not logged in)', async () => {
    mockAuth.mockResolvedValue(null as any)

    await expect(requireLeagueMember(1)).rejects.toThrow(AppError)
    await expect(requireLeagueMember(1)).rejects.toThrow('Unauthorized: Login required')
  })

  it('should throw with UNAUTHORIZED code and 401 status when not logged in', async () => {
    mockAuth.mockResolvedValue(null as any)

    try {
      await requireLeagueMember(1)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('UNAUTHORIZED')
      expect((error as AppError).statusCode).toBe(401)
    }
  })

  it('should throw when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: { username: 'noId' } } as any)

    await expect(requireLeagueMember(1)).rejects.toThrow('Unauthorized: Login required')
  })

  it('should throw AppError when user is not a member of the league', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    mockPrisma.leagueUser.findFirst.mockResolvedValue(null)

    await expect(requireLeagueMember(1)).rejects.toThrow(
      'Unauthorized: Not a member of this league'
    )
  })

  it('should throw with FORBIDDEN code and 403 status when not a member', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    mockPrisma.leagueUser.findFirst.mockResolvedValue(null)

    try {
      await requireLeagueMember(1)
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as AppError).code).toBe('FORBIDDEN')
      expect((error as AppError).statusCode).toBe(403)
    }
  })

  it('should parse user id as integer', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '99', username: 'user99' },
    } as any)
    mockPrisma.leagueUser.findFirst.mockResolvedValue(leagueUserRecord as any)

    await requireLeagueMember(1)

    expect(mockPrisma.leagueUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 99 }),
      })
    )
  })

  it('should return league admin user correctly', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    const adminLeagueUser = { ...leagueUserRecord, admin: true }
    mockPrisma.leagueUser.findFirst.mockResolvedValue(adminLeagueUser as any)

    const result = await requireLeagueMember(1)

    expect(result.leagueUser.admin).toBe(true)
  })
})

describe('getMostActiveLeagueId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the most active league id', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    mockPrisma.leagueUser.findMany.mockResolvedValue([
      {
        id: 1,
        admin: false,
        paid: true,
        League: {
          id: 10,
          name: 'League A',
          seasonFrom: new Date('2025-01-01'),
          seasonTo: new Date('2025-12-31'),
          isTheMostActive: false,
          Sport: { id: 1, name: 'Hockey' },
        },
      },
      {
        id: 2,
        admin: false,
        paid: true,
        League: {
          id: 20,
          name: 'League B',
          seasonFrom: new Date('2026-01-01'),
          seasonTo: new Date('2026-12-31'),
          isTheMostActive: true,
          Sport: { id: 2, name: 'Football' },
        },
      },
    ] as any)

    const result = await getMostActiveLeagueId()

    expect(result).toBe(20)
  })

  it('should return first league when none is marked most active', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    mockPrisma.leagueUser.findMany.mockResolvedValue([
      {
        id: 1,
        admin: false,
        paid: true,
        League: {
          id: 30,
          name: 'League C',
          seasonFrom: new Date('2026-01-01'),
          seasonTo: new Date('2026-12-31'),
          isTheMostActive: false,
          Sport: { id: 1, name: 'Hockey' },
        },
      },
      {
        id: 2,
        admin: false,
        paid: true,
        League: {
          id: 40,
          name: 'League D',
          seasonFrom: new Date('2025-01-01'),
          seasonTo: new Date('2025-12-31'),
          isTheMostActive: false,
          Sport: { id: 1, name: 'Hockey' },
        },
      },
    ] as any)

    const result = await getMostActiveLeagueId()

    expect(result).toBe(30)
  })

  it('should return null when user has no leagues', async () => {
    mockAuth.mockResolvedValue(authenticatedSession as any)
    mockPrisma.leagueUser.findMany.mockResolvedValue([])

    const result = await getMostActiveLeagueId()

    expect(result).toBeNull()
  })

  it('should throw when user is not authenticated', async () => {
    mockAuth.mockResolvedValue(null as any)

    await expect(getMostActiveLeagueId()).rejects.toThrow('Unauthorized: Login required')
  })
})

describe('isBettingOpen', () => {
  it('should return true when deadline is in the future', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    expect(isBettingOpen(futureDate)).toBe(true)
  })

  it('should return false when deadline is in the past', () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    expect(isBettingOpen(pastDate)).toBe(false)
  })

  it('should accept string dates (from unstable_cache serialization)', () => {
    const futureString = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(isBettingOpen(futureString)).toBe(true)

    const pastString = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(isBettingOpen(pastString)).toBe(false)
  })

  it('should return false when deadline is exactly now', () => {
    // new Date() inside function will be >= deadline
    const now = new Date()
    expect(isBettingOpen(now)).toBe(false)
  })
})
