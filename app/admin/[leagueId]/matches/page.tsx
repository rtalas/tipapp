import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { validateLeagueAccess } from '@/lib/league-utils'
import { getMatches } from '@/actions/matches'
import { getLeaguesWithTeams } from '@/actions/shared-queries'
import { getUsers } from '@/actions/users'
import { getMatchPhases } from '@/actions/match-phases'
import { MatchesContent } from '@/components/admin/matches/matches-content'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

async function MatchesData({ league }: { league: { id: number; name: string } }) {
  const [matches, leagues, users, phases] = await Promise.all([
    getMatches({ leagueId: league.id }),
    getLeaguesWithTeams(),
    getUsers(),
    getMatchPhases(),
  ])

  return <MatchesContent matches={matches} leagues={leagues} users={users} league={league} phases={phases} />
}

async function MatchesLoading() {
  const t = await getTranslations('admin.matches')
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('loadingMatches')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Desktop skeleton */}
        <div className="hidden md:block rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[80px]">{t('id')}</TableHead>
                <TableHead>{t('dateTime')}</TableHead>
                <TableHead>{t('league')}</TableHead>
                <TableHead>{t('matchup')}</TableHead>
                <TableHead className="text-center">{t('score')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-center">{t('userBets')}</TableHead>
                <TableHead className="w-[80px]">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-4 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                  <TableCell><div className="h-6 w-20 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                  <TableCell><div className="h-8 w-8 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-4 w-10 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
                  <div className="h-4 w-10 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function LeagueMatchesPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const t = await getTranslations('admin.matches')
  const { leagueId } = await params
  const league = await validateLeagueAccess(leagueId)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description', {
            leagueName: league.name,
            season: `${league.seasonFrom}/${league.seasonTo}`
          })}
        </p>
      </div>

      <Suspense fallback={<MatchesLoading />}>
        <MatchesData league={league} />
      </Suspense>
    </div>
  )
}
