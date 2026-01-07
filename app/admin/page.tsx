import { Suspense } from 'react'
import { Trophy, Calendar, UserPlus, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card className="card-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

async function DashboardStats() {
  const [leagueCount, pendingMatchCount, pendingRequestCount, userCount] =
    await Promise.all([
      prisma.league.count(),
      prisma.match.count({
        where: {
          isEvaluated: false,
          dateTime: { lt: new Date() },
        },
      }),
      prisma.userRequest.count({
        where: { decided: false },
      }),
      prisma.user.count(),
    ])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Leagues"
        value={leagueCount}
        icon={<Trophy className="h-4 w-4" />}
        description="Active prediction leagues"
      />
      <StatCard
        title="Pending Results"
        value={pendingMatchCount}
        icon={<Calendar className="h-4 w-4" />}
        description="Matches awaiting evaluation"
      />
      <StatCard
        title="Join Requests"
        value={pendingRequestCount}
        icon={<UserPlus className="h-4 w-4" />}
        description="Pending user requests"
      />
      <StatCard
        title="Total Users"
        value={userCount}
        icon={<Users className="h-4 w-4" />}
        description="Registered users"
      />
    </div>
  )
}

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your TipApp administration
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

      {/* Placeholder for recent activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Recent Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent matches to display.
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Recent Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No pending requests to display.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
