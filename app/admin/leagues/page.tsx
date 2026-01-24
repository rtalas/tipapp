import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getLeagues } from '@/actions/leagues'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { LeagueActions } from '@/components/admin/leagues/league-actions'

async function LeaguesTable() {
  const t = await getTranslations('admin.leagues')
  const tPlayers = await getTranslations('admin.players')
  const tCommon = await getTranslations('admin.common')
  const leagues = await getLeagues()

  if (leagues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">{t('noLeaguesFound')}</p>
        <Button asChild>
          <Link href="/admin/leagues/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('createFirst')}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tCommon('name')}</TableHead>
            <TableHead>{t('sport')}</TableHead>
            <TableHead>{t('season')}</TableHead>
            <TableHead>{t('teams')}</TableHead>
            <TableHead>{t('users')}</TableHead>
            <TableHead>{tCommon('status')}</TableHead>
            <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leagues.map((league) => (
            <TableRow key={league.id} className="table-row-hover">
              <TableCell className="font-medium">{league.name}</TableCell>
              <TableCell>{league.Sport?.name || '-'}</TableCell>
              <TableCell className="font-mono text-sm">
                {league.seasonFrom}/{league.seasonTo}
              </TableCell>
              <TableCell>{league._count.LeagueTeam}</TableCell>
              <TableCell>{league._count.LeagueUser}</TableCell>
              <TableCell>
                {league.isActive ? (
                  <Badge variant="success">{tPlayers('active')}</Badge>
                ) : (
                  <Badge variant="secondary">{tPlayers('inactive')}</Badge>
                )}
              </TableCell>
              <TableCell>
                <LeagueActions
                  leagueId={league.id}
                  leagueName={league.name}
                  seasonFrom={league.seasonFrom}
                  seasonTo={league.seasonTo}
                  isActive={league.isActive}
                  isPublic={league.isPublic}
                  isChatEnabled={league.isChatEnabled}
                  chatSuspendedAt={league.chatSuspendedAt}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

async function LeaguesTableLoading() {
  const t = await getTranslations('admin.leagues')
  const tCommon = await getTranslations('admin.common')
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tCommon('name')}</TableHead>
            <TableHead>{t('sport')}</TableHead>
            <TableHead>{t('season')}</TableHead>
            <TableHead>{t('teams')}</TableHead>
            <TableHead>{t('users')}</TableHead>
            <TableHead>{tCommon('status')}</TableHead>
            <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
              <TableCell><div className="h-6 w-16 bg-muted animate-pulse rounded-full" /></TableCell>
              <TableCell><div className="h-8 w-8 bg-muted animate-pulse rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default async function LeaguesPage() {
  const t = await getTranslations('admin.leagues')
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/leagues/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('createLeague')}
          </Link>
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder={t('searchPlaceholder')}
          className="max-w-sm"
        />
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('allLeagues')}</CardTitle>
          <CardDescription>{t('viewAndManage')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LeaguesTableLoading />}>
            <LeaguesTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
