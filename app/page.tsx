import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getMostActiveLeagueId } from '@/lib/auth/user-auth-utils'
import { AvailableLeaguesContent } from '@/components/user/landing/available-leagues-content'

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

  // Show available leagues landing page
  return <AvailableLeaguesContent user={session.user} />
}
