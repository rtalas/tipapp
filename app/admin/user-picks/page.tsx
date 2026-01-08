import { getMatchesWithUserBets } from '@/actions/user-bets'
import { prisma } from '@/lib/prisma'
import { UserPicksContent } from '@/components/admin/user-picks/user-picks-content'

export default async function UserPicksPage() {
  // Fetch data in parallel
  const [matches, leagues, users] = await Promise.all([
    getMatchesWithUserBets(),
    prisma.league.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Picks</h1>
        <p className="text-muted-foreground">
          View and manage all user predictions for matches. Edit bets or create missing predictions.
        </p>
      </div>

      <UserPicksContent matches={matches} leagues={leagues} users={users} />
    </div>
  )
}
