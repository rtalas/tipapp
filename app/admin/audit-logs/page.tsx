import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { AuditLogsContent } from '@/components/admin/audit-logs/audit-logs-content'
import { getRecentAuditLogs } from '@/lib/audit-queries'
import { EventCategory } from '@/lib/logging/audit-logger'
import { TableSkeleton } from '@/components/admin/common/table-skeleton'
import { getUsers } from '@/actions/users'

async function AuditLogsData({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const page = Number(searchParams.page) || 1
  const limit = 50
  const offset = (page - 1) * limit

  const eventCategory = searchParams.category as string | undefined
  const failedOnly = searchParams.status === 'failed'
  const successOnly = searchParams.status === 'success'
  const userId = searchParams.userId ? Number(searchParams.userId) : undefined

  const [{ logs, total, hasMore }, users] = await Promise.all([
    getRecentAuditLogs({
      limit,
      offset,
      eventCategory: eventCategory as EventCategory | undefined,
      failedOnly,
      successOnly,
      userId,
    }),
    getUsers(),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <AuditLogsContent
      logs={logs}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      hasMore={hasMore}
      users={users}
    />
  )
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const t = await getTranslations('admin.auditLogs')
  const params = await searchParams

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
        <AuditLogsData searchParams={params} />
      </Suspense>
    </div>
  )
}
