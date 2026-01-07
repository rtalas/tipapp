import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
  const leagues = await getLeagues()

  if (leagues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-4">No leagues found</p>
        <Button asChild>
          <Link href="/admin/leagues/new">
            <Plus className="mr-2 h-4 w-4" />
            Create your first league
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
            <TableHead>Name</TableHead>
            <TableHead>Sport</TableHead>
            <TableHead>Season</TableHead>
            <TableHead>Teams</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
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
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
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
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function LeaguesTableLoading() {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Sport</TableHead>
            <TableHead>Season</TableHead>
            <TableHead>Teams</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
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

export default function LeaguesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leagues</h1>
          <p className="text-muted-foreground">
            Manage prediction leagues and their settings
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/leagues/new">
            <Plus className="mr-2 h-4 w-4" />
            Create League
          </Link>
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search leagues..."
          className="max-w-sm"
        />
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>All Leagues</CardTitle>
          <CardDescription>View and manage all prediction leagues</CardDescription>
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
