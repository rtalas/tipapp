import { validateLeagueAccess } from '@/lib/league-utils'
import { getSpecialBetsWithUserBets } from '@/actions/special-bet-bets'
import { getUsers } from '@/actions/users'
import { prisma } from '@/lib/prisma'
import { SpecialBetsContent } from '@/components/admin/special-bets/special-bets-content'

export default async function LeagueSpecialBetsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const league = await validateLeagueAccess(leagueId)

  const [specialBets, leagues, specialBetTypes, users] = await Promise.all([
    getSpecialBetsWithUserBets({ leagueId: league.id }),
    prisma.league.findMany({
      where: { id: league.id, deletedAt: null },
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
          Special bets in {league.name} {league.seasonFrom}/{league.seasonTo}
        </p>
      </div>

      <SpecialBetsContent
        specialBets={specialBets}
        leagues={leagues}
        specialBetTypes={specialBetTypes}
        users={users}
        league={league}
      />
    </div>
  )
}
