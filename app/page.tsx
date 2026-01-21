import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getMostActiveLeagueId } from '@/lib/user-auth-utils'
import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

export default async function Home() {
  const session = await auth()

  // If not authenticated, redirect to login
  if (!session?.user) {
    redirect('/login')
  }

  // Try to get the user's most active league
  const leagueId = await getMostActiveLeagueId()

  if (leagueId) {
    // Redirect to the user's active league matches page
    redirect(`/${leagueId}/matches`)
  }

  // Fallback: show a simple page if user has no leagues
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <main className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to TipApp
          </h1>
          <p className="mt-2 text-muted-foreground">
            Signed in as{' '}
            <span className="font-semibold">
              {session.user.username || session.user.email}
            </span>
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 text-left">
          <h2 className="text-lg font-semibold mb-2">No leagues found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You are not a member of any active leagues. Please contact an
            administrator to be added to a league.
          </p>
          {session.user.isSuperadmin && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Admin Dashboard
            </Link>
          )}
        </div>

        <SignOutButton />
      </main>
    </div>
  )
}
