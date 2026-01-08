import { getSpecialBetsWithUserBets } from '@/actions/special-bet-bets'
import { prisma } from '@/lib/prisma'
import { SpecialBetPicksContent } from '@/components/admin/special-bet-picks/special-bet-picks-content'

export default async function SpecialBetPicksPage() {
  const [specialBets, leagues, users] = await Promise.all([
    getSpecialBetsWithUserBets(),
    prisma.league.findMany({
      where: { deletedAt: null, isActive: true },
      include: {
        LeagueTeam: {
          where: { deletedAt: null },
          include: {
            Team: true,
            LeaguePlayer: {
              where: { deletedAt: null },
              include: { Player: true },
            },
          },
          orderBy: { Team: { name: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Special Bet Picks</h1>
        <p className="text-muted-foreground">
          View and manage all user predictions for special bets.
        </p>
      </div>

      <SpecialBetPicksContent specialBets={specialBets} leagues={leagues} users={users} />
    </div>
  )
}
