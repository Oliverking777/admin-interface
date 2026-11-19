import type { BadgeVariant } from "@/components/ui/Badge";
import type { StockInitializationStatus } from "@/types/inventory/inventory";

export const INITIALIZATION_STATUSES: StockInitializationStatus[] = ["COMPLETED", "CANCELLED"];

export const INITIALIZATION_STATUS_LABEL: Record<StockInitializationStatus, string> = {
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const INITIALIZATION_STATUS_VARIANT: Record<StockInitializationStatus, BadgeVariant> = {
  COMPLETED: "success",
  CANCELLED: "neutral",
};

/** A whole number, 0 or more, from a text field. Null when the text is anything else. */
export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

export function formatProductCount(count: number): string {
  return `${count} ${count === 1 ? "product" : "products"}`;
}