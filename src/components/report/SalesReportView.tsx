"use client";

import Card from "@/components/ui/Card";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import {
  ReportFootnote,
  ReportState,
  SummaryGrid,
  SummaryTile,
} from "@/components/report/ReportParts";
import { formatCount, formatDay, formatFcfa } from "@/components/report/report-format";
import { cn } from "@/lib/cn";
import type { SalesGroupBy, SalesReport, SalesReportRow } from "@/types/report/report";

const GROUPS: TabItem<SalesGroupBy>[] = [
  { value: "NONE", label: "Total" },
  { value: "LOCATION", label: "By location" },
  { value: "DAY", label: "By day" },
];

type SalesReportViewProps = {
  report: SalesReport | undefined;
  loading: boolean;
  /** True while new filters load and the previous report is still shown. */
  refreshing: boolean;
  error: unknown;
  onRetry: () => void;
  groupBy: SalesGroupBy;
  onGroupByChange: (groupBy: SalesGroupBy) => void;
};

function groupName(row: SalesReportRow, groupBy: SalesGroupBy): string {
  if (groupBy === "DAY") return formatDay(row.groupKey);
  if (groupBy === "LOCATION") return row.groupLabel ?? "Unknown location";
  return row.groupLabel ?? "All";
}

/**
 * Sales over the period: headline figures, then the rows for the chosen grouping with a total line.
 * Net = gross - discount. Collected is cash received in the period, which can differ from net sales.
 */
export default function SalesReportView({
  report,
  loading,
  refreshing,
  error,
  onRetry,
  groupBy,
  onGroupByChange,
}: SalesReportViewProps) {
  const totals = report?.totals;
  const rows = report?.rows ?? [];
  // With NONE the single row equals the totals: the table only adds the total line once.
  const showRows = groupBy !== "NONE";
  const noSales = !!totals && totals.completedSalesCount === 0 && totals.paymentCollectedAmount === 0;

  return (
    <div className="flex flex-col gap-4">
      {totals && (
        <SummaryGrid>
          <SummaryTile
            label="Net sales"
            value={formatFcfa(totals.netSalesAmount)}
            hint={`${formatCount(totals.completedSalesCount)} completed sales`}
            tone="primary"
          />
          <SummaryTile
            label="Discounts"
            value={formatFcfa(totals.discountAmount)}
            hint={`Gross ${formatFcfa(totals.grossSalesAmount)}`}
          />
          <SummaryTile label="Cash collected" value={formatFcfa(totals.paymentCollectedAmount)} hint="Payments received" />
          <SummaryTile
            label="Outstanding"
            value={formatFcfa(totals.outstandingAmount)}
            hint="Still owed by customers"
            tone={totals.outstandingAmount > 0 ? "warning" : "default"}
          />
        </SummaryGrid>
      )}

      <Card padded={false} aria-busy={loading || refreshing || undefined}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">Sales</h2>
          <Tabs items={GROUPS} value={groupBy} onChange={onGroupByChange} aria-label="Group sales" />
        </div>

        {loading || error || !report || noSales ? (
          <ReportState
            loading={loading || (!report && !error)}
            error={error}
            onRetry={onRetry}
            empty={noSales}
            emptyTitle="No sales in this period"
            emptyHint="Try a longer period or another location."
          />
        ) : (
          <div className={cn("transition-opacity", refreshing && "opacity-60")}>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>{groupBy === "DAY" ? "Day" : groupBy === "LOCATION" ? "Location" : "Period"}</TableHeaderCell>
                  <TableHeaderCell className="text-right">Sales</TableHeaderCell>
                  <TableHeaderCell className="text-right">Gross</TableHeaderCell>
                  <TableHeaderCell className="text-right">Discount</TableHeaderCell>
                  <TableHeaderCell className="text-right">Net</TableHeaderCell>
                  <TableHeaderCell className="text-right">Collected</TableHeaderCell>
                  <TableHeaderCell className="text-right">Outstanding</TableHeaderCell>
                </tr>
              </TableHead>
              {showRows && (
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.groupKey}>
                      <TableCell className="whitespace-nowrap font-medium">{groupName(row, groupBy)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCount(row.completedSalesCount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatFcfa(row.grossSalesAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatFcfa(row.discountAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatFcfa(row.netSalesAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatFcfa(row.paymentCollectedAmount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatFcfa(row.outstandingAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
              <tfoot className={cn("bg-muted/40", showRows && "border-t border-border")}>
                <tr className="text-sm">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {showRows ? "Total" : `${formatDay(report.periodStart)} – ${formatDay(report.periodEnd)}`}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCount(report.totals.completedSalesCount)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatFcfa(report.totals.grossSalesAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatFcfa(report.totals.discountAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatFcfa(report.totals.netSalesAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatFcfa(report.totals.paymentCollectedAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatFcfa(report.totals.outstandingAmount)}</td>
                </tr>
              </tfoot>
            </Table>
          </div>
        )}
      </Card>

      <ReportFootnote asOf={report?.asOf} refreshing={refreshing} />
    </div>
  );
}