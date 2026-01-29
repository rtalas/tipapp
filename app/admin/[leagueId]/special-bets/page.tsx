import { getTranslations } from 'next-intl/server'
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
  const t = await getTranslations('admin.specialBets')
  const { leagueId } = await params
  const league = await validateLeagueAccess(leagueId)

  const [specialBets, leagues, specialBetTypes, evaluators, users] = await Promise.all([
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
    prisma.evaluator.findMany({
      where: {
        leagueId: league.id,
        entity: 'special',
        deletedAt: null,
      },
      include: {
        EvaluatorType: true,
      },
      orderBy: { name: 'asc' },
    }),
    getUsers(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description', {
            leagueName: league.name,
            season: `${league.seasonFrom}/${league.seasonTo}`
          })}
        </p>
      </div>

      <SpecialBetsContent
        specialBets={specialBets}
        leagues={leagues}
        specialBetTypes={specialBetTypes}
        evaluators={evaluators.map(e => ({ id: e.id, name: e.name, EvaluatorType: e.EvaluatorType }))}
        users={users}
        league={league}
      />
    </div>
  )
}
