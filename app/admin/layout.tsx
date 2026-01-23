import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { getActiveLeagues } from '@/lib/league-utils'

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth check handled by proxy.ts
  const session = await auth()
  if (!session?.user?.isSuperadmin) {
    redirect('/login')
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
