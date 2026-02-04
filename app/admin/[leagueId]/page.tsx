import { redirect } from 'next/navigation'

export default async function AdminLeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  redirect(`/admin/${leagueId}/matches`)
}
