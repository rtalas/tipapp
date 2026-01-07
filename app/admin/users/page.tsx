import { getPendingRequests, getLeagueUsers } from '@/actions/users'
import { prisma } from '@/lib/prisma'
import { UsersContent } from '@/components/admin/users/users-content'

export default async function UsersPage() {
  // Fetch data in parallel
  const [pendingRequests, leagueUsers, leagues] = await Promise.all([
    getPendingRequests(),
    getLeagueUsers(),
    prisma.league.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user requests and league memberships.
        </p>
      </div>

      <UsersContent
        pendingRequests={pendingRequests}
        leagueUsers={leagueUsers}
        leagues={leagues}
      />
    </div>
  )
}
