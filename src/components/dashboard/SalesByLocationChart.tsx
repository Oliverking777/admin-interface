"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { WidgetCard, WidgetState } from "@/components/dashboard/DashboardParts";
import { formatCount, formatFcfa } from "@/components/dashboard/dashboard-format";
import { useSalesByLocation } from "@/hooks/dashboard/use-dashboard";
import type { ISODate } from "@/types/dashboard/dashboard";

type SalesByLocationChartProps = {
  /** Both or neither (default: today). */
  from?: ISODate;
  to?: ISODate;
  title?: string;
};

const BAR_HEIGHT = 28;

/**
 * Net sales per location in the user's scope. The bar chart only appears with more than one location;
 * every location is also listed with its sales count and the payments collected.
 */
export default function SalesByLocationChart({ from, to, title = "Sales by location today" }: SalesByLocationChartProps) {
  const query = useSalesByLocation({ from, to });
  const rows = (query.data ?? []).map((r) => ({ ...r, name: r.locationName ?? "Unknown location" }));

  return (
    <WidgetCard title={title} link={{ href: "/reports", label: "Reports" }}>
      <WidgetState
        loading={query.isPending}
        error={query.isError ? query.error : null}
        onRetry={() => query.refetch()}
        empty={rows.length === 0}
        emptyText="No location in your scope."
      />

      {!query.isPending && !query.isError && rows.length > 1 && (
        <div style={{ height: rows.length * BAR_HEIGHT + 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-accent)" }}
                formatter={(value) => formatFcfa(Number(value))}
                contentStyle={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 0,
                  background: "var(--background)",
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="completedSalesAmount" name="Net sales" fill="var(--color-primary)" radius={0} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {!query.isPending && !query.isError && rows.length > 0 && (
        <ul className="mt-2 divide-y divide-border text-sm">
          {rows.map((r) => (
            <li key={r.locationId} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate text-foreground">{r.name}</span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="font-medium text-foreground">{formatFcfa(r.completedSalesAmount)}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatCount(r.completedSalesCount)} sales · {formatFcfa(r.paymentsCollectedAmount)} collected
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}