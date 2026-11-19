"use client";

/**
 * Report queries and the CSV export.
 *
 *   component -> hook -> reportService -> apiClient
 *
 * Queries switch themselves off when the user lacks REPORT_VIEW, and the period reports wait until both dates
 * are chosen (the backend refuses a period without them). The previous result stays on screen while new
 * filters load. Reports are read-only, so nothing here invalidates other modules.
 *
 * Errors are ApiError: 400 invalid period or filter, 403 location outside the user's scope,
 * 503 a source module is unavailable (retried automatically, see query-client).
 */

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/iam/use-auth";
import { reportKeys } from "@/hooks/report/report-query-keys";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { saveFile } from "@/lib/save-file";
import { reportService, type ReportFile } from "@/services/report/report-service";
import type {
  DebtReport,
  PurchasingReport,
  ReportName,
  SalesReport,
  StockReport,
  TopProductsReport,
  TransferReport,
} from "@/types/report/report";
import type {
  DebtReportQuery,
  PurchasingReportQuery,
  ReportQueryByName,
  SalesReportQuery,
  StockReportQuery,
  TopProductsReportQuery,
  TransferReportQuery,
} from "@/types/report/report-dto";

type QueryOptions = { enabled?: boolean };

/** Drops empty filters so "" and undefined give the same query key and are not sent. */
function clean<T extends object>(filters: T): T {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as T;
}

/** True once both dates of a period are set. */
const hasPeriod = (q: { from?: string; to?: string }) => !!q.from && !!q.to;

/** Shared settings of every report query. */
function useReportQuery<T>(
  name: ReportName,
  filters: object,
  fetcher: (signal: AbortSignal) => Promise<T>,
  ready: boolean,
  options: QueryOptions,
) {
  const { hasPermission } = useAuth();

  return useQuery<T, ApiError>({
    queryKey: reportKeys.reportWith(name, filters),
    queryFn: ({ signal }) => fetcher(signal),
    enabled: (options.enabled ?? true) && ready && hasPermission(PERMISSIONS.AUDIT_READ),
    placeholderData: keepPreviousData,
  });
}

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

/** Sales, cash collected and outstanding debt over a period, grouped by nothing, location or day. */
export function useSalesReport(query: SalesReportQuery, options: QueryOptions = {}) {
  const q = clean(query);
  return useReportQuery<SalesReport>("SALES", q, (signal) => reportService.getSales(q, signal), hasPeriod(q), options);
}

/** Stock on hand and in transit, now (no period). Paged: page starts at 0, size 1 to 200 (default 50). */
export function useStockReport(query: StockReportQuery = {}, options: QueryOptions = {}) {
  const q = clean(query);
  return useReportQuery<StockReport>("STOCK", q, (signal) => reportService.getStock(q, signal), true, options);
}

/** Purchases per supplier over a period. */
export function usePurchasingReport(query: PurchasingReportQuery, options: QueryOptions = {}) {
  const q = clean(query);
  return useReportQuery<PurchasingReport>(
    "PURCHASING",
    q,
    (signal) => reportService.getPurchasing(q, signal),
    hasPeriod(q),
    options,
  );
}

/** Transfers per route over a period. */
export function useTransferReport(query: TransferReportQuery, options: QueryOptions = {}) {
  const q = clean(query);
  return useReportQuery<TransferReport>(
    "TRANSFERS",
    q,
    (signal) => reportService.getTransfers(q, signal),
    hasPeriod(q),
    options,
  );
}

/** Customer debts over a period (only those still owing unless onlyOutstanding is false). */
export function useDebtReport(query: DebtReportQuery, options: QueryOptions = {}) {
  const q = clean(query);
  return useReportQuery<DebtReport>("DEBTS", q, (signal) => reportService.getDebts(q, signal), hasPeriod(q), options);
}

/** Best selling products over a period, by quantity or value (limit 1 to 50, default 10). */
export function useTopProductsReport(query: TopProductsReportQuery, options: QueryOptions = {}) {
  const q = clean(query);
  return useReportQuery<TopProductsReport>(
    "TOP_PRODUCTS",
    q,
    (signal) => reportService.getTopProducts(q, signal),
    hasPeriod(q),
    options,
  );
}

/* -------------------------------------------------------------------------- */
/*  Export                                                                    */
/* -------------------------------------------------------------------------- */

type ExportVariables = { [N in ReportName]: { report: N; filters: ReportQueryByName[N] } }[ReportName];

/**
 * Needs REPORT_EXPORT. Downloads the report as CSV with the given filters (all rows, at most 10,000:
 * otherwise a 400 asking to narrow the period or location). The browser saves the file on success.
 * Every export is audited by the backend.
 */
export function useExportReport() {
  return useMutation<ReportFile, ApiError, ExportVariables>({
    mutationFn: ({ report, filters }) => reportService.exportCsv(report, clean(filters)),
    onSuccess: (file) => saveFile(file.content, file.filename),
  });
}

/** What the current user may do with reports, for showing or hiding controls. */
export function useReportAbilities() {
  const { hasPermission } = useAuth();
  return {
    view: hasPermission(PERMISSIONS.AUDIT_READ),
    export: hasPermission(PERMISSIONS.AUDIT_READ),
  };
}