import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getLocale } from 'next-intl/server'
import { AdminLayout } from '@/components/admin/layout/admin-layout'
import { getActiveLeagues } from '@/lib/league-utils'

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s | TipApp Admin',
  },
}

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

  // Get current locale for i18n
  const locale = await getLocale()

  return (
    <AdminLayout
      user={{
        username: session.user.username,
        isSuperadmin: session.user.isSuperadmin,
      }}
      leagues={leagues}
      locale={locale}
    >
      {children}
    </AdminLayout>
  )
}
