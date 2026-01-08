import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getPendingRequests, getLeagueUsers } from '@/actions/users'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { UsersContent } from '@/components/admin/users/users-content'

interface LeagueUsersPageProps {
  params: Promise<{ id: string }>
}

export default async function LeagueUsersPage({ params }: LeagueUsersPageProps) {
  const { id } = await params
  const leagueId = parseInt(id, 10)

  if (isNaN(leagueId)) {
    notFound()
  }

  // Fetch league details
  const league = await prisma.league.findUnique({
    where: { id: leagueId, deletedAt: null },
  })

  if (!league) {
    notFound()
  }

  // Fetch data in parallel - filter for this specific league
  const [pendingRequests, leagueUsers] = await Promise.all([
    getPendingRequests(),
    getLeagueUsers({ leagueId }),
  ])

  // Filter pending requests for this league only
  const filteredRequests = pendingRequests.filter((req) => req.leagueId === leagueId)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/leagues">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leagues
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {league.name} - User Management
        </h1>
        <p className="text-muted-foreground">
          Manage user requests and memberships for this league.
        </p>
      </div>

      <UsersContent
        pendingRequests={filteredRequests}
        leagueUsers={leagueUsers}
        leagues={[league]}
      />
    </div>
  )
}
