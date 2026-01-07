import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { AdminLayout } from '@/components/admin/layout/admin-layout'

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

  return (
    <AdminLayout
      user={{
        username: session.user.username,
        isSuperadmin: session.user.isSuperadmin,
      }}
    >
      {children}
    </AdminLayout>
  )
}
