"use client";

/**
 * Dashboard: a live overview of today for the user's scope.
 * The backend decides the scope from the user's permissions: users with DASHBOARD_VIEW_ALL see every location
 * and may narrow to one; the others only ever see their own location, so they get no filter.
 *
 * The summary is loaded once here and shared by the banner and the stat cards. Every other card loads its own
 * data, so one failing part never blanks the whole page. Everything refreshes itself every minute.
 */

import { useIsFetching } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import AlertsPanel from "@/components/dashboard/AlertsPanel";
import LowStockBanner from "@/components/dashboard/LowStockBanner";
import PendingTransfersCard from "@/components/dashboard/PendingTransfersCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivityFeed from "@/components/dashboard/RecentActivityFeed";
import SalesByLocationChart from "@/components/dashboard/SalesByLocationChart";
import StatsGrid from "@/components/dashboard/StatsGrid";
import StockStatusChart from "@/components/dashboard/StockStatusChart";
import { PartialDataNote } from "@/components/dashboard/DashboardParts";
import { dashboardErrorMessage, formatDateTime } from "@/components/dashboard/dashboard-format";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import { useAllLocations } from "@/hooks/business/use-locations";
import { dashboardKeys } from "@/hooks/dashboard/dashboard-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import {
  useDashboardAbilities,
  useDashboardSummary,
  useRefreshDashboard,
} from "@/hooks/dashboard/use-dashboard";
import type { ScopeInfo } from "@/types/dashboard/dashboard";

/** "All locations", one name, or "3 locations". */
function scopeLabel(scope: ScopeInfo | undefined): string {
  if (!scope) return "";
  if (scope.type === "ALL") return "All locations";
  if (scope.locations.length === 0) return "No location assigned";
  if (scope.locations.length === 1) return scope.locations[0].locationName ?? "Your location";
  return `${scope.locations.length} locations`;
}

export default function DashboardPage() {
  const { isLoading: authLoading } = useAuth();
  const { view, viewAll } = useDashboardAbilities();

  // Location filter: only for users who may see every location (the list needs LOCATION_READ).
  const [locationId, setLocationId] = useState("");
  const locationsQuery = useAllLocations({ enabled: viewAll });
  const locations = useMemo(
    () =>
      (locationsQuery.data ?? [])
        .filter((l) => l.status !== "INACTIVE")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locationsQuery.data],
  );
  const scopedLocation = viewAll && locationId ? locationId : undefined;

  const summary = useDashboardSummary({ locationId: scopedLocation });
  const refresh = useRefreshDashboard();
  const refreshing = useIsFetching({ queryKey: dashboardKeys.all }) > 0;

  if (authLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  }

  if (!view) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">You don&apos;t have access to the dashboard.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask an administrator for the DASHBOARD_VIEW permission.</p>
      </Card>
    );
  }

  const data = summary.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {data ? `${scopeLabel(data.locationScope)} · updated ${formatDateTime(data.asOf)}` : "Today at a glance"}
            {refreshing && data && " · refreshing…"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {viewAll && (
            <Select
              aria-label="Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={locationsQuery.isPending && locations.length === 0}
              className="min-w-48"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          )}
          <Button variant="secondary" size="sm" onClick={() => refresh()} disabled={refreshing}>
            Refresh
          </Button>
        </div>
      </div>

      {summary.isError && !data && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p role="alert" className="text-sm text-foreground">
            {dashboardErrorMessage(summary.error)}
          </p>
          <Button variant="secondary" size="sm" onClick={() => summary.refetch()}>
            Try again
          </Button>
        </Card>
      )}

      <LowStockBanner stock={data?.stock} />

      <StatsGrid summary={data} loading={summary.isPending} />
      {data && <PartialDataNote names={data.unavailableSections} />}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <StockStatusChart stock={data?.stock} loading={summary.isPending} />
          <AlertsPanel locationId={scopedLocation} />
        </div>
        <div className="space-y-3">
          {/* Sales by location always covers the whole scope: it is a comparison between locations. */}
          <SalesByLocationChart />
          <PendingTransfersCard locationId={scopedLocation} />
        </div>
      </div>

      <RecentActivityFeed />

      <QuickActions />
    </div>
  );
}