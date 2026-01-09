import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function AdminPage() {
  // Get the most active league
  const mostActiveLeague = await prisma.league.findFirst({
    where: {
      isTheMostActive: true,
      isActive: true,
      deletedAt: null,
    },
  })

  // If most active league exists, redirect to its matches page
  if (mostActiveLeague) {
    redirect(`/admin/${mostActiveLeague.id}/matches`)
  }

  // Otherwise, get any active league
  const anyActiveLeague = await prisma.league.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: { seasonFrom: 'desc' },
  })

  if (anyActiveLeague) {
    redirect(`/admin/${anyActiveLeague.id}/matches`)
  }

  // No active leagues, redirect to leagues management
  redirect('/admin/leagues')
}
