import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { getActiveLeagues } from '@/lib/league-utils'

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Double-check admin access (middleware should handle this, but extra safety)
  if (!session?.user?.isSuperadmin) {
    redirect('/')
  }

  // Fetch active leagues for sidebar and league selector
  const leagues = await getActiveLeagues()

  return (
    <AdminLayout
      user={{
        username: session.user.username,
        isSuperadmin: session.user.isSuperadmin,
      }}
      leagues={leagues}
    >
      {children}
    </AdminLayout>
  )
}
