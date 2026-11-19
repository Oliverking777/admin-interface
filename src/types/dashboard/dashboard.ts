/**
 * Dashboard models. They mirror the backend Dashboard module (tsgp.yah_enterprise.dashboard.domain.model):
 * field names match the JSON exactly, so they need no mapping.
 *
 * Money is whole FCFA. "Today" is the current day in the business time zone (Africa/Douala).
 * Dashboard data is a live view built on each request: `asOf` says when.
 */

import type { ISODateTime, UUID } from "@/types/iam/user";

/** "YYYY-MM-DD". */
export type ISODate = string;

/* -------------------------------------------------------------------------- */
/*  Limits (same as the backend)                                              */
/* -------------------------------------------------------------------------- */

/** DashboardPeriod: both dates included, at most this many days, in this time zone. */
export const DASHBOARD_PERIOD_MAX_DAYS = 366;
export const DASHBOARD_TIME_ZONE = "Africa/Douala";

/** OperationalAlertsResult.MAX_ALERTS: at most this many alerts are returned (totalCount gives the real number). */
export const DASHBOARD_MAX_ALERTS = 100;

/** DashboardService: pending lists page size 1 to MAX (default 20). */
export const DASHBOARD_DEFAULT_PAGE_SIZE = 20;
export const DASHBOARD_MAX_PAGE_SIZE = 100;
/** DashboardService: recent activity limit 1 to MAX (default 20). */
export const RECENT_ACTIVITY_DEFAULT_LIMIT = 20;
export const RECENT_ACTIVITY_MAX_LIMIT = 50;
/** AlertService: low-stock alerts limit 1 to MAX (default 20). */
export const LOW_STOCK_DEFAULT_LIMIT = 20;
export const LOW_STOCK_MAX_LIMIT = 100;

/* -------------------------------------------------------------------------- */
/*  Scope                                                                     */
/* -------------------------------------------------------------------------- */

export type LocationRef = {
  locationId: UUID;
  /** Null when the name could not be found. */
  locationName: string | null;
};

/**
 * ScopeInfo: what the dashboard covers, decided by the backend from the user's permissions.
 * "ALL" is every location (locations is empty); "LOCATIONS" is the listed ones
 * (an empty list gives an empty dashboard).
 */
export type ScopeInfo = {
  type: "ALL" | "LOCATIONS";
  locations: LocationRef[];
};

/* -------------------------------------------------------------------------- */
/*  Summary (the headline figures)                                            */
/* -------------------------------------------------------------------------- */

export type SalesSection = {
  completedSalesCountToday: number;
  /** Net amount (after discounts) of today's completed sales. */
  completedSalesAmountToday: number;
};

export type MoneySection = {
  paymentsCollectedToday: number;
  /** Everything customers still owe, whatever the day of the sale. */
  outstandingCustomerBalance: number;
};

/**
 * Stock lines (one product at one location) by status. Each line is in exactly one of the three,
 * so together they are every line in scope.
 */
export type StockSection = {
  /** Above its low-stock threshold, or no threshold set. */
  inStockProductCount: number;
  /** Above 0 and at or under its threshold. */
  lowStockProductCount: number;
  /** Quantity 0 or less. */
  outOfStockProductCount: number;
};

/** Things waiting for someone's decision. */
export type PendingSection = {
  pendingOrderCount: number;
  pendingCreditRequestCount: number;
  pendingStockAdjustmentCount: number;
};

export type LogisticsSection = {
  /** Transfers sent and not yet received. */
  pendingTransferCount: number;
  /** Purchases ordered (SUBMITTED) and not yet delivered. */
  purchaseAwaitingDeliveryCount: number;
};

/** The summary sections, as named in unavailableSections. */
export type DashboardSectionName = "sales" | "money" | "stock" | "pending" | "logistics";

/**
 * DashboardSummary. A section whose source module failed (or was too slow) is null and its name is listed
 * in unavailableSections, so the rest of the dashboard still shows.
 */
export type DashboardSummary = {
  asOf: ISODateTime;
  locationScope: ScopeInfo;
  /** Sections that could not be built (each is then null). Empty when all is well. */
  unavailableSections: DashboardSectionName[];
  sales: SalesSection | null;
  money: MoneySection | null;
  stock: StockSection | null;
  pending: PendingSection | null;
  logistics: LogisticsSection | null;
};

/* -------------------------------------------------------------------------- */
/*  Sales per location                                                        */
/* -------------------------------------------------------------------------- */

/** Sorted by location name. Amounts are net of discounts. */
export type LocationSalesSummary = {
  locationId: UUID;
  /** Null when the name could not be found. */
  locationName: string | null;
  completedSalesCount: number;
  completedSalesAmount: number;
  paymentsCollectedAmount: number;
};

/* -------------------------------------------------------------------------- */
/*  Operational alerts                                                        */
/* -------------------------------------------------------------------------- */

export type AlertType =
  | "OUT_OF_STOCK"
  | "LOW_STOCK"
  | "ORDER_AWAITING_VALIDATION"
  | "CREDIT_REQUEST_PENDING"
  | "STOCK_ADJUSTMENT_PENDING"
  | "TRANSFER_NOT_RECEIVED"
  | "TRANSFER_DISCREPANCY"
  /** Past its expected delivery date (or a week after ordering when it has none). */
  | "PURCHASE_NOT_DELIVERED"
  /** Delivered with rejected or missing goods, in the last 30 days. */
  | "PURCHASE_DISCREPANCY";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

/** Kind of record an alert is about: entityId is the id of that record. */
export type AlertEntityType =
  | "PRODUCT"
  | "ORDER"
  | "CREDIT_APPROVAL"
  | "STOCK_ADJUSTMENT"
  | "TRANSFER"
  | "PURCHASE";

/** The alert sources, as named in unavailableSources. */
export type AlertSourceName =
  | "stock"
  | "orders"
  | "credit"
  | "adjustments"
  | "transfers"
  | "purchases";

/** AlertSeverity.rank(): higher is more urgent. The backend already sorts by it. */
export const ALERT_SEVERITY_RANK: Record<AlertSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

/**
 * Something that needs attention now. Alerts are derived from the current state on each request:
 * there is no history, so resolvedAt is always null for now.
 */
export type OperationalAlert = {
  /**
   * "TYPE:entityType:entityId" (stock alerts add ":locationId"): stable while the alert lasts,
   * usable as a React key.
   */
  alertKey: string;
  alertType: AlertType;
  /** The location concerned: the destination for a transfer or a purchase. */
  locationId: UUID | null;
  entityType: AlertEntityType;
  /** Id of the record (for stock alerts: the product). */
  entityId: UUID;
  severity: AlertSeverity;
  /** Ready-to-show sentence written by the backend. */
  message: string;
  /** When the situation started (e.g. when the order was placed, or when a purchase became late). */
  createdAt: ISODateTime;
  /** Always null for now. */
  resolvedAt: ISODateTime | null;
};

/**
 * OperationalAlertsResult. Most severe first, then oldest first. At most DASHBOARD_MAX_ALERTS alerts;
 * totalCount is the real number. A source that failed is listed in unavailableSources and its alerts are missing.
 */
export type OperationalAlertsResult = {
  asOf: ISODateTime;
  locationScope: ScopeInfo;
  alerts: OperationalAlert[];
  totalCount: number;
  unavailableSources: AlertSourceName[];
};

/* -------------------------------------------------------------------------- */
/*  Pending work lists                                                        */
/* -------------------------------------------------------------------------- */

/** An order waiting to be validated. Lists are oldest first. */
export type PendingOrder = {
  orderId: UUID;
  orderNumber: string;
  locationId: UUID;
  locationName: string | null;
  /** Null for a walk-in sale without a customer. */
  customerId: UUID | null;
  /** Whole FCFA. */
  totalAmount: number;
  createdAt: ISODateTime;
};

export type OrderPendingPage = {
  items: PendingOrder[];
  /** Zero-based. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/** A transfer is sent when it is created, so the only stage left is waiting for the destination to receive it. */
export type TransferStage = "AWAITING_RECEIPT";

/** A transfer sent and not yet received. Lists are oldest first. */
export type PendingTransfer = {
  transferId: UUID;
  transferNumber: string;
  stage: TransferStage;
  sourceLocationId: UUID;
  sourceLocationName: string | null;
  destinationLocationId: UUID;
  destinationLocationName: string | null;
  /** When it was sent. */
  since: ISODateTime;
};

export type TransferPendingPage = {
  items: PendingTransfer[];
  /** Zero-based. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/* -------------------------------------------------------------------------- */
/*  Recent activity                                                           */
/* -------------------------------------------------------------------------- */

/** One audited business action (security entries are left out), newest first. */
export type RecentActivityItem = {
  occurredAt: ISODateTime;
  /** Null for actions done by the system. */
  actorId: UUID | null;
  /** e.g. "PURCHASE.CONFIRMED", "STOCK.ADJUSTMENT_APPROVED". */
  action: string;
  entityType: string;
  entityId: UUID | null;
  locationId: UUID | null;
  /** e.g. SUCCESS or FAILURE. */
  outcome: string;
};