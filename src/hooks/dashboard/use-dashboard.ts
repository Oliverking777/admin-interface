"use client";

/**
 * Dashboard queries.
 *
 *   component -> hook -> dashboardService -> apiClient
 *
 * Queries switch themselves off when the user lacks DASHBOARD_VIEW. The dashboard is a live view
 * (the backend sends Cache-Control: no-store), so data is always treated as stale and refreshed every minute
 * while the tab is visible, and again when the user comes back to it. The previous result stays on screen
 * while new filters or a new page load.
 *
 * Errors are ApiError: 400 invalid filter, 403 location outside the user's scope,
 * 503 a source module is unavailable (retried automatically, see query-client).
 */

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { dashboardKeys } from "@/hooks/dashboard/dashboard-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { dashboardService } from "@/services/dashboard/dashboard-service";
import type {
  DashboardSummary,
  LocationSalesSummary,
  OperationalAlert,
  OperationalAlertsResult,
  OrderPendingPage,
  RecentActivityItem,
  TransferPendingPage,
} from "@/types/dashboard/dashboard";
import type {
  DashboardSummaryQuery,
  LowStockQuery,
  OperationalAlertsQuery,
  PendingOrdersQuery,
  PendingTransfersQuery,
  RecentActivityQuery,
  SalesByLocationQuery,
} from "@/types/dashboard/dashboard-dto";

/** How often the dashboard refreshes itself while visible. */
export const DASHBOARD_REFRESH_MS = 60_000;

type QueryOptions = {
  enabled?: boolean;
  /** Override the auto refresh (false turns it off). */
  refetchInterval?: number | false;
};

/** Drops empty filters so "" and undefined give the same query key and are not sent. */
function clean<T extends object>(filters: T): T {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as T;
}

/** Shared settings of every dashboard query. */
function useDashboardQuery<T>(
  queryKey: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: QueryOptions,
  ready = true,
) {
  const { hasPermission } = useAuth();

  return useQuery<T, ApiError>({
    queryKey,
    queryFn: ({ signal }) => fetcher(signal),
    enabled: (options.enabled ?? true) && ready && hasPermission(PERMISSIONS.DASHBOARD_READ),
    staleTime: 0,
    refetchInterval: options.refetchInterval ?? DASHBOARD_REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

/** Today's headline figures. Check unavailableSections: a failed section is null, not an error. */
export function useDashboardSummary(query: DashboardSummaryQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  return useDashboardQuery<DashboardSummary>(
    dashboardKeys.summary(q),
    (signal) => dashboardService.getSummary(q, signal),
    options,
  );
}

/**
 * Sales and payments per location. Without dates the backend uses today.
 * With only one date set the query waits for the other (the backend needs both or neither).
 */
export function useSalesByLocation(query: SalesByLocationQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  const ready = !q.from === !q.to;
  return useDashboardQuery<LocationSalesSummary[]>(
    dashboardKeys.salesByLocation(q),
    (signal) => dashboardService.getSalesByLocation(q, signal),
    options,
    ready,
  );
}

/** Out-of-stock and low-stock alerts. */
export function useLowStockAlerts(query: LowStockQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  return useDashboardQuery<OperationalAlert[]>(
    dashboardKeys.lowStock(q),
    (signal) => dashboardService.getLowStock(q, signal),
    options,
  );
}

/** Orders waiting for validation, oldest first (paged). */
export function usePendingOrders(query: PendingOrdersQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  return useDashboardQuery<OrderPendingPage>(
    dashboardKeys.pendingOrders(q),
    (signal) => dashboardService.getPendingOrders(q, signal),
    options,
  );
}

/** Transfers sent and not yet received, oldest first (paged). */
export function usePendingTransfers(query: PendingTransfersQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  return useDashboardQuery<TransferPendingPage>(
    dashboardKeys.pendingTransfers(q),
    (signal) => dashboardService.getPendingTransfers(q, signal),
    options,
  );
}

/** Latest business actions in scope, newest first. */
export function useRecentActivity(query: RecentActivityQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  return useDashboardQuery<RecentActivityItem[]>(
    dashboardKeys.recentActivity(q),
    (signal) => dashboardService.getRecentActivity(q, signal),
    options,
  );
}

/** Current alerts, most severe first. Check unavailableSources: a failed source is missing, not an error. */
export function useOperationalAlerts(query: OperationalAlertsQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  return useDashboardQuery<OperationalAlertsResult>(
    dashboardKeys.alerts(q),
    (signal) => dashboardService.getAlerts(q, signal),
    options,
  );
}

/** Refreshes every dashboard query now (for a "Refresh" button). */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: dashboardKeys.all }), [queryClient]);
}

/** What the user may do on the dashboard. viewAll: may see every location and pick one in a filter. */
export function useDashboardAbilities() {
  const { hasPermission } = useAuth();
  return {
    view: hasPermission(PERMISSIONS.DASHBOARD_READ),
    viewAll: hasPermission(PERMISSIONS.DASHBOARD_READ),
  };
}