/**
 * Query keys for the Reports module, in one place.
 * Keys are hierarchical: invalidating reportKeys.all refreshes every report, reportKeys.report(name) one report.
 */

import type { ReportName } from "@/types/report/report";

export const reportKeys = {
  all: ["reports"] as const,

  report: (name: ReportName) => [...reportKeys.all, name] as const,
  /** One report with its filters (dates, location, grouping, paging...). */
  reportWith: (name: ReportName, filters: object) => [...reportKeys.report(name), filters] as const,
};