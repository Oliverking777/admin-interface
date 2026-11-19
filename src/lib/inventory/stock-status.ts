import type { BadgeVariant } from "@/components/ui/Badge";
import type { StockStatus } from "@/types/inventory/stock-row";

/** Out of stock means quantity 0. Otherwise the backend's `lowStock` flag decides. */
export function getStockStatus(quantity: number, lowStock: boolean): StockStatus {
  if (quantity <= 0) return "OUT_OF_STOCK";
  return lowStock ? "LOW_STOCK" : "IN_STOCK";
}

export const STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

export const STATUS_VARIANT: Record<StockStatus, BadgeVariant> = {
  IN_STOCK: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "danger",
};

/** Sorting by status puts the products that need attention first. */
export const STATUS_ORDER: Record<StockStatus, number> = {
  OUT_OF_STOCK: 0,
  LOW_STOCK: 1,
  IN_STOCK: 2,
};