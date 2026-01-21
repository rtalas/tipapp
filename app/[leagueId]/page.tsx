import { redirect } from 'next/navigation'

interface LeaguePageProps {
  params: Promise<{ leagueId: string }>
}

export default async function LeaguePage({ params }: LeaguePageProps) {
  const { leagueId } = await params
  // Redirect to matches by default
  redirect(`/${leagueId}/matches`)
}
