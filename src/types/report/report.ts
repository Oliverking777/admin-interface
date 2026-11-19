/**
 * Report models. They mirror the backend Reports module (tsgp.yah_enterprise.reports.domain.model):
 * field names match the JSON exactly, so they need no mapping.
 *
 * Money is whole FCFA. Quantities are base units. Dates of a period are local dates (YYYY-MM-DD) in the
 * business time zone, both included. `asOf` is when the report was built (ISO date-time).
 */

import type { ISODateTime, UUID } from "@/types/iam/user";

/** "YYYY-MM-DD". */
export type ISODate = string;

/* -------------------------------------------------------------------------- */
/*  Enums and limits (same as the backend)                                    */
/* -------------------------------------------------------------------------- */

/** ReportName: the report and the URL segment it is served under. */
export type ReportName = "SALES" | "STOCK" | "PURCHASING" | "TRANSFERS" | "DEBTS" | "TOP_PRODUCTS";

/** ReportName.path(): the segment used in the report URLs. */
export const REPORT_PATH: Record<ReportName, string> = {
  SALES: "sales",
  STOCK: "stock",
  PURCHASING: "purchasing",
  TRANSFERS: "transfers",
  DEBTS: "debts",
  TOP_PRODUCTS: "top-products",
};

/** How sales rows are grouped: one total row, one row per location, or one row per day. */
export type SalesGroupBy = "NONE" | "LOCATION" | "DAY";

/** Stock status of a product at a location. */
export type StockStatus = "OUT_OF_STOCK" | "LOW" | "OK";

/** What top products are ranked by: units sold or sales value. */
export type TopMetric = "QUANTITY" | "VALUE";

/** ReportPeriod: both dates included, at most this many days. */
export const REPORT_PERIOD_MAX_DAYS = 366;
/** ReportPeriod.BUSINESS_ZONE: period dates are read in this time zone. */
export const REPORT_TIME_ZONE = "Africa/Douala";

/** ReportService: stock report page size, 1 to MAX (default 50). */
export const STOCK_REPORT_DEFAULT_PAGE_SIZE = 50;
export const STOCK_REPORT_MAX_PAGE_SIZE = 200;
/** ReportService: top products limit, 1 to MAX (default 10). */
export const TOP_PRODUCTS_DEFAULT_LIMIT = 10;
export const TOP_PRODUCTS_MAX_LIMIT = 50;
/** ReportExportService: a CSV export has at most this many rows (otherwise 400). */
export const REPORT_EXPORT_MAX_ROWS = 10_000;

/** groupKey of the totals row of the sales report, and of the single row when groupBy is NONE. */
export const SALES_TOTAL_KEY = "TOTAL";
export const SALES_ALL_KEY = "ALL";

/* -------------------------------------------------------------------------- */
/*  Scope                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * ReportScope: what a report was built for, decided by the backend from the user's permissions
 * (REPORT_VIEW_ALL), never from the request. "ALL" is every location (locationIds is empty);
 * "LOCATIONS" is the listed ones, sorted (an empty list gives an empty report).
 */
export type ReportScope = {
  type: "ALL" | "LOCATIONS";
  locationIds: UUID[];
};

/** Fields shared by every report that covers a period. */
type PeriodReport = {
  periodStart: ISODate;
  periodEnd: ISODate;
  asOf: ISODateTime;
  scope: ReportScope;
};

/* -------------------------------------------------------------------------- */
/*  Sales                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * gross = sum of order subtotals, net = gross - discount.
 * Collected is cash received in the period, a different number from sales.
 */
export type SalesReportRow = {
  /**
   * LOCATION: the location id. DAY: the day ("YYYY-MM-DD"). NONE: "ALL".
   * "TOTAL" on the totals row.
   */
  groupKey: string;
  /** "All", the day, the location name or "Total". Null when a location name could not be found. */
  groupLabel: string | null;
  completedSalesCount: number;
  grossSalesAmount: number;
  discountAmount: number;
  netSalesAmount: number;
  paymentCollectedAmount: number;
  outstandingAmount: number;
};

export type SalesReport = PeriodReport & {
  groupBy: SalesGroupBy;
  /** NONE: one row. LOCATION: sorted by location name. DAY: sorted by day. */
  rows: SalesReportRow[];
  totals: SalesReportRow;
};

/* -------------------------------------------------------------------------- */
/*  Stock (a snapshot, no period, paged)                                      */
/* -------------------------------------------------------------------------- */

export type StockReportRow = {
  locationId: UUID;
  /** Null when the name could not be found. */
  locationName: string | null;
  productId: UUID;
  /** Null when the name could not be found. */
  productName: string | null;
  quantityOnHand: number;
  /** Sent to this location and not yet received. */
  quantityInTransit: number;
  /** Null when no threshold is set. */
  lowStockThreshold: number | null;
  stockStatus: StockStatus;
  /** Always null for now: no valuation method is chosen yet. */
  valuationAmount: number | null;
};

export type StockReport = {
  asOf: ISODateTime;
  scope: ReportScope;
  rows: StockReportRow[];
  /** Zero-based. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

/* -------------------------------------------------------------------------- */
/*  Purchasing                                                                */
/* -------------------------------------------------------------------------- */

/**
 * One supplier. On the totals row supplierId is null and supplierName is "Total".
 * Ordered figures: purchases created in the period and not cancelled.
 * Delivery figures (accepted, rejected, cost, discrepancies): purchases confirmed in the period.
 */
export type PurchasingReportRow = {
  supplierId: UUID | null;
  /** Null when the name could not be found. */
  supplierName: string | null;
  purchaseCount: number;
  orderedQuantity: number;
  orderedAmount: number;
  /** Went into stock. */
  acceptedQuantity: number;
  /** Refused at delivery. */
  rejectedQuantity: number;
  /** What the accepted goods cost. */
  purchaseCost: number;
  /** Deliveries with rejected or missing goods. */
  discrepancyCount: number;
};

export type PurchasingReport = PeriodReport & {
  /** Sorted by supplier name. */
  rows: PurchasingReportRow[];
  totals: PurchasingReportRow;
};

/* -------------------------------------------------------------------------- */
/*  Transfers                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * One route (source to destination). On the totals row every id is null, sourceLocationName is "Total"
 * and destinationLocationName is null.
 */
export type TransferReportRow = {
  sourceLocationId: UUID | null;
  /** Null when the name could not be found. */
  sourceLocationName: string | null;
  destinationLocationId: UUID | null;
  destinationLocationName: string | null;
  /** Sent in the period (cancelled transfers excluded). */
  sentQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  /** Transfers not yet received. */
  pendingTransferCount: number;
  discrepancyCount: number;
};

export type TransferReport = PeriodReport & {
  /** Sorted by source, then destination name. */
  rows: TransferReportRow[];
  totals: TransferReportRow;
};

/* -------------------------------------------------------------------------- */
/*  Customer debts                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One customer at one location. outstanding = due - paid.
 * On the totals row the ids and locationName are null and customerName is "Total".
 */
export type DebtReportRow = {
  customerId: UUID | null;
  /** Null when the name could not be found. */
  customerName: string | null;
  locationId: UUID | null;
  locationName: string | null;
  amountDue: number;
  amountPaid: number;
  outstandingBalance: number;
};

export type DebtReport = PeriodReport & {
  /** True when only customers with a balance left are listed. */
  onlyOutstanding: boolean;
  /** Largest outstanding balance first. */
  rows: DebtReportRow[];
  totals: DebtReportRow;
};

/* -------------------------------------------------------------------------- */
/*  Top products                                                              */
/* -------------------------------------------------------------------------- */

export type TopProductsReportRow = {
  /** 1 for the best product. */
  rank: number;
  productId: UUID;
  /** Null when the name could not be found. */
  productName: string | null;
  quantitySold: number;
  salesValue: number;
};

export type TopProductsReport = PeriodReport & {
  metric: TopMetric;
  /** How many products were asked for (default 10). */
  limit: number;
  /** Best first; ties are broken by product name. */
  rows: TopProductsReportRow[];
};