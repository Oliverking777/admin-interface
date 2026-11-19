"use client";

import Link from "next/link";

import Badge from "@/components/ui/Badge";
import { PartialDataNote, WidgetCard, WidgetState } from "@/components/dashboard/DashboardParts";
import {
  SEVERITY_BADGE,
  SEVERITY_LABEL,
  alertHref,
  formatCount,
  formatDateTime,
  timeAgo,
} from "@/components/dashboard/dashboard-format";
import { useOperationalAlerts } from "@/hooks/dashboard/use-dashboard";
import type { UUID } from "@/types/iam/user";
import type { AlertSeverity } from "@/types/dashboard/dashboard";

type AlertsPanelProps = {
  locationId?: UUID;
  /** Only this severity; every alert when left out. */
  severity?: AlertSeverity;
  /** How many alerts to show (the backend already sorts them, most severe first). */
  max?: number;
};

/** What needs attention now, most severe first. Each alert links to where it can be dealt with. */
export default function AlertsPanel({ locationId, severity, max = 8 }: AlertsPanelProps) {
  const query = useOperationalAlerts({ locationId, severity });
  const alerts = query.data?.alerts ?? [];
  const shown = alerts.slice(0, max);
  const total = query.data?.totalCount ?? 0;
  const critical = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <WidgetCard title={total > 0 ? `Needs attention (${formatCount(total)})` : "Needs attention"}>
      {critical > 0 && (
        <p className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{formatCount(critical)} critical</p>
      )}
      <WidgetState
        loading={query.isPending}
        error={query.isError ? query.error : null}
        onRetry={() => query.refetch()}
        empty={alerts.length === 0}
        emptyText="All clear. Nothing needs attention."
        lines={4}
      />
      {!query.isPending && !query.isError && shown.length > 0 && (
        <ul className="divide-y divide-border">
          {shown.map((a) => (
            <li key={a.alertKey}>
              <Link
                href={alertHref(a.entityType)}
                className="flex items-start gap-3 py-2.5 text-sm transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Badge variant={SEVERITY_BADGE[a.severity]} className="mt-0.5 shrink-0">
                  {SEVERITY_LABEL[a.severity]}
                </Badge>
                <span className="min-w-0 flex-1 text-foreground">{a.message}</span>
                <time
                  dateTime={a.createdAt}
                  title={formatDateTime(a.createdAt)}
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  {timeAgo(a.createdAt)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!query.isPending && total > shown.length && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {formatCount(shown.length)} of {formatCount(total)}.
        </p>
      )}
      {query.data && <PartialDataNote names={query.data.unavailableSources} />}
    </WidgetCard>
  );
}