"use client";

import { useMemo } from "react";

import ActivityItem from "@/components/dashboard/ActivityItem";
import { WidgetCard, WidgetState } from "@/components/dashboard/DashboardParts";
import { useAllLocations, useMyLocation } from "@/hooks/business/use-locations";
import { useRecentActivity } from "@/hooks/dashboard/use-dashboard";

type RecentActivityFeedProps = {
  /** How many actions to show (1 to 50). */
  limit?: number;
  /** "View all" link, e.g. to an audit log page. Hidden when not given. */
  viewAllHref?: string;
};

/** Latest business actions in the user's scope, newest first. Refreshes itself with the dashboard. */
export default function RecentActivityFeed({ limit = 5, viewAllHref }: RecentActivityFeedProps) {
  const activity = useRecentActivity({ limit });
  // Location names: every location for users with LOCATION_READ (the hook checks), else their own.
  const all = useAllLocations();
  const mine = useMyLocation();

  const locationNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const l of all.data ?? []) names.set(l.id, l.name);
    if (mine.data) names.set(mine.data.id, mine.data.name);
    return names;
  }, [all.data, mine.data]);

  const items = activity.data ?? [];

  return (
    <WidgetCard title="Recent activity" link={viewAllHref ? { href: viewAllHref, label: "View all" } : undefined}>
      <WidgetState
        loading={activity.isPending}
        error={activity.isError ? activity.error : null}
        onRetry={() => activity.refetch()}
        empty={items.length === 0}
        emptyText="No recent activity."
        lines={5}
      />
      {!activity.isPending && !activity.isError && items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <ActivityItem
              key={`${item.occurredAt}:${item.action}:${item.entityId ?? i}`}
              item={item}
              locationName={item.locationId ? locationNames.get(item.locationId) : null}
            />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}