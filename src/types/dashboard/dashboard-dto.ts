/**
 * Query parameters of the /dashboard endpoints (DashboardController).
 *
 * The responses already have the shape of dashboard.ts, so there are no response DTOs here.
 * locationId narrows the view to one location; it must be inside the user's scope
 * (all locations need DASHBOARD_VIEW_ALL), otherwise the backend answers 403.
 */

import type { UUID } from "@/types/iam/user";
import type { AlertSeverity, ISODate } from "@/types/dashboard/dashboard";

/** GET /dashboard/summary */
export type DashboardSummaryQuery = {
  locationId?: UUID;
};

/**
 * GET /dashboard/sales-by-location. Both dates included, at most DASHBOARD_PERIOD_MAX_DAYS days.
 * Without dates the backend uses today. No locationId: it lists every location in the user's scope.
 */
export type SalesByLocationQuery = {
  from?: ISODate;
  to?: ISODate;
};

/** GET /dashboard/low-stock. limit 1 to LOW_STOCK_MAX_LIMIT (default 20). */
export type LowStockQuery = {
  locationId?: UUID;
  limit?: number;
};

/** GET /dashboard/pending-orders and /pending-transfers. page is zero-based; size 1 to DASHBOARD_MAX_PAGE_SIZE (default 20). */
export type DashboardPageQuery = {
  locationId?: UUID;
  page?: number;
  size?: number;
};

export type PendingOrdersQuery = DashboardPageQuery;
export type PendingTransfersQuery = DashboardPageQuery;

/** GET /dashboard/recent-activity. limit 1 to RECENT_ACTIVITY_MAX_LIMIT (default 20). No locationId: it covers the user's scope. */
export type RecentActivityQuery = {
  limit?: number;
};

/** GET /dashboard/alerts. Without severity every alert is returned. */
export type OperationalAlertsQuery = {
  locationId?: UUID;
  severity?: AlertSeverity;
};