import { getSpecialBets } from '@/actions/special-bets'
import { prisma } from '@/lib/prisma'
import { SpecialBetsContent } from '@/components/admin/special-bets/special-bets-content'

export default async function SpecialBetsPage() {
  const [specialBets, leagues, specialBetTypes] = await Promise.all([
    getSpecialBets(),
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
      />
    </div>
  )
}
