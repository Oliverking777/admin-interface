"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { WidgetCard, WidgetState } from "@/components/dashboard/DashboardParts";
import { formatCount } from "@/components/dashboard/dashboard-format";
import type { StockSection } from "@/types/dashboard/dashboard";

type Slice = { key: "in" | "low" | "out"; label: string; count: number; color: string };

type StockStatusChartProps = {
  /** summary.stock: null when the stock section could not be loaded. */
  stock: StockSection | null | undefined;
  loading?: boolean;
};

/** Share of stock lines (product at a location) in stock, running low and out of stock. */
export default function StockStatusChart({ stock, loading = false }: StockStatusChartProps) {
  const slices: Slice[] = stock
    ? [
        { key: "in", label: "In stock", count: stock.inStockProductCount, color: "var(--color-primary)" },
        { key: "low", label: "Running low", count: stock.lowStockProductCount, color: "#c98a1f" },
        { key: "out", label: "Out of stock", count: stock.outOfStockProductCount, color: "#dc2626" },
      ]
    : [];
  const total = slices.reduce((sum, s) => sum + s.count, 0);

  return (
    <WidgetCard title="Stock status" link={{ href: "/inventory/stock", label: "View stock" }}>
      {stock === null && !loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Stock figures are unavailable right now.</p>
      ) : (
        <WidgetState
          loading={loading && !stock}
          error={null}
          onRetry={() => undefined}
          empty={!!stock && total === 0}
          emptyText="No stock recorded yet."
        />
      )}

      {stock && total > 0 && (
        <div className="flex items-center gap-4">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Empty slices are left out so they do not draw a gap. */}
                <Pie
                  data={slices.filter((s) => s.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices
                    .filter((s) => s.count > 0)
                    .map((s) => (
                      <Cell key={s.key} fill={s.color} />
                    ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCount(Number(value))}
                  contentStyle={{
                    border: "1px solid var(--color-border)",
                    borderRadius: 0,
                    background: "var(--background)",
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-foreground tabular-nums">{formatCount(total)}</span>
              <span className="text-xs text-muted-foreground">Stock lines</span>
            </div>
          </div>

          <ul className="flex-1 space-y-2">
            {slices.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-foreground">
                  <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: s.color }} aria-hidden="true" />
                  {s.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatCount(s.count)}
                  <span className="ml-1 text-xs">({Math.round((s.count / total) * 100)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stock && total > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Counted per product per location.</p>
      )}
    </WidgetCard>
  );
}