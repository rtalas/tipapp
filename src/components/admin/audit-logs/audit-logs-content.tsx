"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Filter, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: number;
  timestamp: Date;
  eventType: string;
  eventCategory: string;
  severity: string;
  userId: number | null;
  resourceType: string | null;
  resourceId: number | null;
  leagueId: number | null;
  action: string | null;
  description: string | null;
  metadata: unknown; // Prisma JsonValue
  durationMs: number | null;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  User: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
  League: {
    id: number;
    name: string;
  } | null;
}

interface AuditLogsContentProps {
  logs: AuditLog[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

function isValidMetadata(metadata: unknown): metadata is Record<string, unknown> {
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
}

export function AuditLogsContent({
  logs,
  total,
  currentPage,
  totalPages,
  hasMore,
}: AuditLogsContentProps) {
  const t = useTranslations("admin.auditLogs");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (logId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to page 1 when filtering
    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const changePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/audit-logs?${params.toString()}`);
  };

  const refresh = () => {
    router.refresh();
  };

  const getEventBadgeColor = (category: string) => {
    switch (category) {
      case "USER_ACTION":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "ADMIN_ACTION":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      case "AUTH":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "EVALUATION":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "ERROR":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "WARNING":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "INFO":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const currentCategory = searchParams.get("category") || "all";
  const currentStatus = searchParams.get("status") || "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("filters")}:</span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Category Filter */}
              <Select value={currentCategory} onValueChange={(value) => updateFilters("category", value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t("allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCategories")}</SelectItem>
                  <SelectItem value="USER_ACTION">{t("categories.USER_ACTION")}</SelectItem>
                  <SelectItem value="ADMIN_ACTION">{t("categories.ADMIN_ACTION")}</SelectItem>
                  <SelectItem value="AUTH">{t("categories.AUTH")}</SelectItem>
                  <SelectItem value="EVALUATION">{t("categories.EVALUATION")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={currentStatus} onValueChange={(value) => updateFilters("status", value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t("allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  <SelectItem value="success">{t("successOnly")}</SelectItem>
                  <SelectItem value="failed">{t("failedOnly")}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("refresh")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        {t("totalActions")}: {total}
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>{t("timestamp")}</TableHead>
                  <TableHead>{t("eventCategory")}</TableHead>
                  <TableHead>{t("user")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                  <TableHead>{t("resource")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("duration")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t("noLogs")}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const isExpanded = expandedRows.has(log.id);
                    return (
                      <React.Fragment key={log.id}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(log.id)}>
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <Badge className={getEventBadgeColor(log.eventCategory)}>
                              {t(`categories.${log.eventCategory}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.User ? (
                              <div className="text-sm">
                                <div className="font-medium">{log.User.username}</div>
                                <div className="text-muted-foreground text-xs">
                                  {log.User.firstName} {log.User.lastName}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t("noUser")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.action && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {log.action}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.resourceType && (
                              <div className="text-sm">
                                <div className="font-medium">{log.resourceType}</div>
                                {log.resourceId && (
                                  <div className="text-muted-foreground text-xs">#{log.resourceId}</div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                log.success
                                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                  : "bg-red-500/10 text-red-700 dark:text-red-400"
                              }
                            >
                              {log.success ? t("success") : t("failed")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {log.durationMs !== null ? `${log.durationMs}${t("ms")}` : "—"}
                          </TableCell>
                        </TableRow>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30">
                              <div className="p-4 space-y-3">
                                {/* Description */}
                                {log.description && (
                                  <div>
                                    <div className="text-sm font-medium mb-1">{t("details")}:</div>
                                    <div className="text-sm text-muted-foreground">{log.description}</div>
                                  </div>
                                )}

                                {/* Event Type & Severity */}
                                <div className="flex gap-4">
                                  <div>
                                    <div className="text-sm font-medium mb-1">{t("eventType")}:</div>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {log.eventType}
                                    </Badge>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium mb-1">{t("severity.INFO")}:</div>
                                    <Badge className={getSeverityBadgeColor(log.severity)}>
                                      {t(`severity.${log.severity}`)}
                                    </Badge>
                                  </div>
                                </div>

                                {/* League */}
                                {log.League && (
                                  <div>
                                    <div className="text-sm font-medium mb-1">League:</div>
                                    <div className="text-sm text-muted-foreground">{log.League.name}</div>
                                  </div>
                                )}

                                {/* Error Message */}
                                {!log.success && log.errorMessage && (
                                  <div>
                                    <div className="text-sm font-medium mb-1 text-red-600 dark:text-red-400">
                                      {t("errorMessage")}:
                                    </div>
                                    <div className="text-sm text-red-600/80 dark:text-red-400/80 font-mono bg-red-50 dark:bg-red-950/20 p-2 rounded">
                                      {log.errorMessage}
                                    </div>
                                    {log.errorCode && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Code: {log.errorCode}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Metadata */}
                                {isValidMetadata(log.metadata) && Object.keys(log.metadata).length > 0 && (
                                  <div>
                                    <div className="text-sm font-medium mb-1">{t("metadata")}:</div>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {t("page")} {currentPage} {t("of")} {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => changePage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
