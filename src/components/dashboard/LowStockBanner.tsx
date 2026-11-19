import Link from "next/link";

import { formatCount } from "@/components/dashboard/dashboard-format";
import type { StockSection } from "@/types/dashboard/dashboard";

/** Shown above the dashboard only when some products are low or out of stock. */
export default function LowStockBanner({ stock }: { stock: StockSection | null | undefined }) {
  if (!stock) return null;
  const { lowStockProductCount: low, outOfStockProductCount: out } = stock;
  if (low === 0 && out === 0) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border border-red-600/40 bg-red-600/5 px-4 py-2.5 text-sm"
    >
      <p className="text-foreground">
        {out > 0 && (
          <span className="font-semibold text-red-600 dark:text-red-400">{formatCount(out)} out of stock</span>
        )}
        {out > 0 && low > 0 && " · "}
        {low > 0 && (
          <span className="font-semibold text-amber-700 dark:text-amber-300">{formatCount(low)} running low</span>
        )}
        {" — restock before sales are lost."}
      </p>
      <Link href="/inventory/stock" className="shrink-0 font-medium text-primary hover:underline">
        View stock
      </Link>
    </div>
  );
}