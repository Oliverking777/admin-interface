/**
 * Query keys for the Dashboard module, in one place.
 * Keys are hierarchical: invalidating dashboardKeys.all refreshes the whole dashboard.
 * Other modules can invalidate it after a change that shows on the dashboard (a sale, a receipt...).
 */

import type {
  DashboardSummaryQuery,
  LowStockQuery,
  OperationalAlertsQuery,
  PendingOrdersQuery,
  PendingTransfersQuery,
  RecentActivityQuery,
  SalesByLocationQuery,
} from "@/types/dashboard/dashboard-dto";

export const dashboardKeys = {
  all: ["dashboard"] as const,

  summary: (query: DashboardSummaryQuery = {}) => [...dashboardKeys.all, "summary", query] as const,
  salesByLocation: (query: SalesByLocationQuery = {}) => [...dashboardKeys.all, "sales-by-location", query] as const,
  lowStock: (query: LowStockQuery = {}) => [...dashboardKeys.all, "low-stock", query] as const,
  pendingOrders: (query: PendingOrdersQuery = {}) => [...dashboardKeys.all, "pending-orders", query] as const,
  pendingTransfers: (query: PendingTransfersQuery = {}) => [...dashboardKeys.all, "pending-transfers", query] as const,
  recentActivity: (query: RecentActivityQuery = {}) => [...dashboardKeys.all, "recent-activity", query] as const,
  alerts: (query: OperationalAlertsQuery = {}) => [...dashboardKeys.all, "alerts", query] as const,
};