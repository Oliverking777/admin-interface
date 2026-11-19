/**
 * Query parameters of the /reports endpoints (ReportController). Responses are the types in report.ts.
 *
 * Dates are local days "YYYY-MM-DD", both included, at most REPORT_PERIOD_MAX_DAYS apart.
 * locationId only narrows what the user may already see: the backend decides the scope from their
 * permissions (REPORT_VIEW_ALL) and answers 403 for a location outside it.
 *
 * Errors: 400 invalid period or filter (or an export over REPORT_EXPORT_MAX_ROWS rows),
 * 403 location not allowed, 503 a source module is unavailable (no partial report is returned).
 */
import type { UUID } from "@/types/iam/user";
import type { ISODate, ReportName, SalesGroupBy, StockStatus, TopMetric } from "@/types/report/report";

/** Every report that covers a period needs both dates. */
type PeriodQuery = {
  /** Required. First day, included. */
  from: ISODate;
  /** Required. Last day, included. */
  to: ISODate;
  /** Optional. One location inside the user's scope. */
  locationId?: UUID;
};

/** GET /reports/sales */
export type SalesReportQuery = PeriodQuery & {
  /** Default NONE (one row). */
  groupBy?: SalesGroupBy;
};

/** GET /reports/stock (a snapshot: no period). */
export type StockReportQuery = {
  locationId?: UUID;
  productId?: UUID;
  status?: StockStatus;
  /** Zero-based. Default 0. */
  page?: number;
  /** 1 to STOCK_REPORT_MAX_PAGE_SIZE. Default 50. */
  size?: number;
};

/** GET /reports/purchasing */
export type PurchasingReportQuery = PeriodQuery & {
  supplierId?: UUID;
};

/** GET /reports/transfers */
export type TransferReportQuery = PeriodQuery & {
  sourceLocationId?: UUID;
  destinationLocationId?: UUID;
};

/** GET /reports/debts */
export type DebtReportQuery = PeriodQuery & {
  customerId?: UUID;
  /** Default true: only customers who still owe something. */
  onlyOutstanding?: boolean;
};

/** GET /reports/top-products */
export type TopProductsReportQuery = PeriodQuery & {
  /** Default QUANTITY. */
  metric?: TopMetric;
  /** 1 to TOP_PRODUCTS_MAX_LIMIT. Default 10. */
  limit?: number;
};

/** The filters of each report, by name. */
export type ReportQueryByName = {
  SALES: SalesReportQuery;
  STOCK: Omit<StockReportQuery, "page" | "size">;
  PURCHASING: PurchasingReportQuery;
  TRANSFERS: TransferReportQuery;
  DEBTS: DebtReportQuery;
  TOP_PRODUCTS: TopProductsReportQuery;
};

/**
 * GET /reports/{path}/export?format=csv&... : the same filters as the report (paging excluded).
 * Answers a CSV file (UTF-8) named in Content-Disposition. Needs REPORT_EXPORT; each export is audited.
 */
export type ReportExportQuery<N extends ReportName = ReportName> = {
  report: N;
  filters: ReportQueryByName[N];
};