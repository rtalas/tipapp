import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { getAllUsersForAdmin } from '@/actions/users'
import { GlobalUsersContent } from '@/components/admin/users/global-users-content'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'

async function UsersData() {
  const users = await getAllUsersForAdmin()
  return <GlobalUsersContent users={users} />
}

export default async function UsersPage() {
  const t = await getTranslations('admin.users')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
        <UsersData />
      </Suspense>
    </div>
  )
}
