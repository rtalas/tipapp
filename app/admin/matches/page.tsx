import { Suspense } from 'react'
import { getMatches, getLeaguesWithTeams } from '@/actions/matches'
import { getUsers } from '@/actions/users'
import { MatchesContent } from '@/components/admin/matches/matches-content'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

async function MatchesData() {
  const [matches, leagues, users] = await Promise.all([
    getMatches(),
    getLeaguesWithTeams(),
    getUsers(),
  ])

  return <MatchesContent matches={matches} leagues={leagues} users={users} />
}

function MatchesLoading() {
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle>All Matches</CardTitle>
        <CardDescription>View and manage matches across all leagues</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>League</TableHead>
                <TableHead>Matchup</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-40 bg-muted animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                  <TableCell><div className="h-6 w-20 bg-muted animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="h-8 w-8 bg-muted animate-pulse rounded" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MatchesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
        <p className="text-muted-foreground">
          Manage matches and enter results across all leagues
        </p>
      </div>

      <Suspense fallback={<MatchesLoading />}>
        <MatchesData />
      </Suspense>
    </div>
  )
}
