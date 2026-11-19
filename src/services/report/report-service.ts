/**
 * Report operations from the frontend's point of view.
 * Talks to /reports through the shared apiClient. Every report is read-only.
 *
 * The backend answers the reports in the shape of report.ts (same field names), so there is no mapping.
 * The location scope comes from the user's permissions (REPORT_VIEW_ALL); a locationId outside it is a 403.
 * Errors: 400 invalid period or filter, 403 location not allowed, 503 a source module is unavailable.
 */
import { apiClient } from "@/lib/api/api-client";
import type { ApiResponse } from "@/types/iam/common-dto";
import {
  REPORT_PATH,
  REPORT_TIME_ZONE,
  type DebtReport,
  type PurchasingReport,
  type ReportName,
  type SalesReport,
  type StockReport,
  type TopProductsReport,
  type TransferReport,
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

const REPORTS_PATH = "/reports";
/** Exports can take longer than a screen report (up to 10,000 rows). */
const EXPORT_TIMEOUT_MS = 60_000;
/**
 * The export endpoint produces text/csv. Errors are still JSON (ApiResponse), so both are accepted:
 * with application/json only, Spring would answer 406 Not Acceptable.
 */
const EXPORT_ACCEPT = "text/csv, application/json";
/** Excel only reads UTF-8 accents (é, ç...) correctly when the file starts with a byte order mark. */
const UTF8_BOM = "﻿";

/** A CSV file ready to be saved. */
export type ReportFile = {
  /** Same name the backend gives it, e.g. "sales-2026-10-01-to-2026-10-31.csv". */
  filename: string;
  content: Blob;
};

/** Query values without the empty ones, as apiClient expects them. */
function toQuery(filters: object): Record<string, string | number | boolean | undefined> {
  return filters as Record<string, string | number | boolean | undefined>;
}

/** Today in the business time zone, "YYYY-MM-DD" (sv-SE formats dates that way). */
function businessToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: REPORT_TIME_ZONE }).format(new Date());
}

/** Mirrors ReportExportService.name(): "{path}-{from}-to-{to}.csv", or "stock-{today}.csv". */
function exportFilename<N extends ReportName>(report: N, filters: ReportQueryByName[N]): string {
  if (report === "STOCK") return `stock-${businessToday()}.csv`;
  const { from, to } = filters as { from: string; to: string };
  return `${REPORT_PATH[report]}-${from}-to-${to}.csv`;
}

async function getReport<T>(name: ReportName, filters: object, signal?: AbortSignal): Promise<T> {
  const response = await apiClient.get<ApiResponse<T>>(`${REPORTS_PATH}/${REPORT_PATH[name]}`, {
    query: toQuery(filters),
    signal,
  });
  return response.data;
}

export const reportService = {
  /** Sales, cash collected and outstanding debt, grouped by nothing, location or day. Needs REPORT_VIEW. */
  getSales(query: SalesReportQuery, signal?: AbortSignal): Promise<SalesReport> {
    return getReport<SalesReport>("SALES", query, signal);
  },

  /** Stock on hand and in transit with its status, now. Paged (size 1 to 200, default 50). Needs REPORT_VIEW. */
  getStock(query: StockReportQuery = {}, signal?: AbortSignal): Promise<StockReport> {
    return getReport<StockReport>("STOCK", query, signal);
  },

  /** Purchases per supplier over the period. Needs REPORT_VIEW. */
  getPurchasing(query: PurchasingReportQuery, signal?: AbortSignal): Promise<PurchasingReport> {
    return getReport<PurchasingReport>("PURCHASING", query, signal);
  },

  /** Transfers per route (source to destination) over the period. Needs REPORT_VIEW. */
  getTransfers(query: TransferReportQuery, signal?: AbortSignal): Promise<TransferReport> {
    return getReport<TransferReport>("TRANSFERS", query, signal);
  },

  /** Customer debts over the period (only those still owing by default). Needs REPORT_VIEW. */
  getDebts(query: DebtReportQuery, signal?: AbortSignal): Promise<DebtReport> {
    return getReport<DebtReport>("DEBTS", query, signal);
  },

  /** Best selling products by quantity or value (limit 1 to 50, default 10). Needs REPORT_VIEW. */
  getTopProducts(query: TopProductsReportQuery, signal?: AbortSignal): Promise<TopProductsReport> {
    return getReport<TopProductsReport>("TOP_PRODUCTS", query, signal);
  },

  /**
   * Exports a report as CSV with the same filters as on screen (paging is ignored: all rows, at most 10,000,
   * otherwise a 400 asking to narrow the period or location). Every export is audited. Needs REPORT_EXPORT.
   */
  async exportCsv<N extends ReportName>(
    report: N,
    filters: ReportQueryByName[N],
    signal?: AbortSignal,
  ): Promise<ReportFile> {
    // apiClient returns a non-JSON body as text, which is exactly the CSV.
    const csv = await apiClient.get<string>(`${REPORTS_PATH}/${REPORT_PATH[report]}/export`, {
      query: { format: "csv", ...toQuery(filters) },
      headers: { Accept: EXPORT_ACCEPT },
      timeoutMs: EXPORT_TIMEOUT_MS,
      signal,
    });
    return {
      filename: exportFilename(report, filters),
      content: new Blob([UTF8_BOM, typeof csv === "string" ? csv : ""], { type: "text/csv;charset=utf-8" }),
    };
  },
};