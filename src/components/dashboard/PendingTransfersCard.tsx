"use client";

import { WidgetCard, WidgetState } from "@/components/dashboard/DashboardParts";
import { formatCount, formatDateTime, timeAgo } from "@/components/dashboard/dashboard-format";
import { usePendingTransfers } from "@/hooks/dashboard/use-dashboard";
import type { UUID } from "@/types/iam/user";

type PendingTransfersCardProps = {
  locationId?: UUID;
  /** How many of the oldest transfers to show. */
  size?: number;
};

/** The oldest transfers sent and not yet received. */
export default function PendingTransfersCard({ locationId, size = 5 }: PendingTransfersCardProps) {
  const query = usePendingTransfers({ locationId, page: 0, size });
  const items = query.data?.items ?? [];
  const total = query.data?.totalElements ?? 0;

  return (
    <WidgetCard
      title="Transfers in transit"
      link={{ href: "/inventory/transfers", label: total > items.length ? `View all ${formatCount(total)}` : "Transfers" }}
    >
      <WidgetState
        loading={query.isPending}
        error={query.isError ? query.error : null}
        onRetry={() => query.refetch()}
        empty={items.length === 0}
        emptyText="No transfer in transit."
      />
      {!query.isPending && !query.isError && items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((t) => (
            <li key={t.transferId} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{t.transferNumber}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.sourceLocationName ?? "Unknown"} → {t.destinationLocationName ?? "Unknown"}
                </p>
              </div>
              <time
                dateTime={t.since}
                title={`Sent ${formatDateTime(t.since)}`}
                className="shrink-0 text-xs text-muted-foreground"
              >
                Sent {timeAgo(t.since)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}