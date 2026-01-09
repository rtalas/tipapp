import { getSpecialBetsWithUserBets } from '@/actions/special-bet-bets'
import { getUsers } from '@/actions/users'
import { prisma } from '@/lib/prisma'
import { SpecialBetsContent } from '@/components/admin/special-bets/special-bets-content'

export default async function SpecialBetsPage() {
  const [specialBets, leagues, specialBetTypes, users] = await Promise.all([
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
    prisma.specialBetSingle.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    getUsers(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Special Bets</h1>
        <p className="text-muted-foreground">
          Manage special bets like tournament winner, top scorer, and other predictions.
        </p>
      </div>

      <SpecialBetsContent
        specialBets={specialBets}
        leagues={leagues}
        specialBetTypes={specialBetTypes}
        users={users}
      />
    </div>
  )
}
