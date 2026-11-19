/**
 * Dashboard operations from the frontend's point of view.
 * Talks to /dashboard through the shared apiClient. Everything is read-only and needs DASHBOARD_VIEW.
 *
 * The backend answers in the shape of dashboard.ts (same field names), so there is no mapping.
 * The location scope comes from the user's permissions (DASHBOARD_VIEW_ALL); a locationId outside it is a 403.
 * Errors: 400 invalid filter (limit, page size, period), 403 location not allowed,
 * 503 a source module is unavailable. The summary and the alerts do not fail for one source:
 * they report it in unavailableSections / unavailableSources instead.
 */
import { apiClient } from "@/lib/api/api-client";
import type { ApiResponse } from "@/types/iam/common-dto";
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

const DASHBOARD_PATH = "/dashboard";

async function get<T>(path: string, query: object, signal?: AbortSignal): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(`${DASHBOARD_PATH}${path}`, {
    query: query as Record<string, string | number | boolean | undefined>,
    signal,
  });
  return response.data;
}

export const dashboardService = {
  /** Today's headline figures. A section whose source failed is null and listed in unavailableSections. */
  getSummary(query: DashboardSummaryQuery = {}, signal?: AbortSignal): Promise<DashboardSummary> {
    return get<DashboardSummary>("/summary", query, signal);
  },

  /** Sales and payments per location in scope, sorted by name. Default period: today. */
  getSalesByLocation(query: SalesByLocationQuery = {}, signal?: AbortSignal): Promise<LocationSalesSummary[]> {
    return get<LocationSalesSummary[]>("/sales-by-location", query, signal);
  },

  /** Out-of-stock and low-stock alerts (limit 1 to 100, default 20). */
  getLowStock(query: LowStockQuery = {}, signal?: AbortSignal): Promise<OperationalAlert[]> {
    return get<OperationalAlert[]>("/low-stock", query, signal);
  },

  /** Orders waiting for validation, oldest first. */
  getPendingOrders(query: PendingOrdersQuery = {}, signal?: AbortSignal): Promise<OrderPendingPage> {
    return get<OrderPendingPage>("/pending-orders", query, signal);
  },

  /** Transfers sent and not yet received, oldest first. */
  getPendingTransfers(query: PendingTransfersQuery = {}, signal?: AbortSignal): Promise<TransferPendingPage> {
    return get<TransferPendingPage>("/pending-transfers", query, signal);
  },

  /** Latest business actions in scope, newest first (limit up to 50). Security entries are left out. */
  getRecentActivity(query: RecentActivityQuery = {}, signal?: AbortSignal): Promise<RecentActivityItem[]> {
    return get<RecentActivityItem[]>("/recent-activity", query, signal);
  },

  /** Current alerts, most severe first, at most 100 (totalCount gives the real number). */
  getAlerts(query: OperationalAlertsQuery = {}, signal?: AbortSignal): Promise<OperationalAlertsResult> {
    return get<OperationalAlertsResult>("/alerts", query, signal);
  },
};