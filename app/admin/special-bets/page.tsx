import { redirect } from 'next/navigation'
import { getActiveLeagues } from '@/lib/league-utils'

export default async function SpecialBetsRedirect() {
  const leagues = await getActiveLeagues()

  if (leagues.length === 0) {
    redirect('/admin/leagues')
  }

  redirect(`/admin/${leagues[0].id}/special-bets`)
}
