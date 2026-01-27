import { getTranslations } from "next-intl/server";
import { AuditLogsContent } from "@/components/admin/audit-logs/audit-logs-content";
import { getRecentAuditLogs } from "@/lib/audit-queries";
import { EventCategory } from "@/lib/audit-logger";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const t = await getTranslations("admin.auditLogs");

  // Await searchParams (Next.js 16 requirement)
  const params = await searchParams;

  // Parse search params for filtering
  const page = Number(params.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  const eventCategory = params.category as string | undefined;
  const failedOnly = params.status === "failed";
  const successOnly = params.status === "success";

  // Fetch audit logs with filters
  const { logs, total, hasMore } = await getRecentAuditLogs({
    limit,
    offset,
    eventCategory: eventCategory as EventCategory | undefined,
    failedOnly,
    successOnly,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <AuditLogsContent
        logs={logs}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        hasMore={hasMore}
      />
    </div>
  );
}
